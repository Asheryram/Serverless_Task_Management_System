#!/usr/bin/env node

// Create Admin User Script
// Usage: node scripts/create-admin.js
//
// Required: AWS CLI configured with credentials
// Required: Infrastructure already deployed (needs User Pool ID from Terraform output)

const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');

const TERRAFORM_DIR = path.resolve(__dirname, '..', 'terraform', 'environments', 'dev');
const ALLOWED_DOMAINS = ['amalitech.com', 'amalitechtraining.org'];

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', ...opts }).trim();
}

function prompt(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);
      let input = '';
      const onData = (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) stdin.setRawMode(wasRaw);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit();
        } else if (c === '\u007F' || c === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('a special character');
  return errors;
}

async function main() {
  console.log('\n============================================');
  console.log('  Create Admin User');
  console.log('============================================\n');

  // Step 1: Get User Pool ID from Terraform
  console.log('Fetching User Pool ID from Terraform...');
  let userPoolId;
  let region;
  try {
    userPoolId = run('terraform output -raw cognito_user_pool_id', { cwd: TERRAFORM_DIR });
    region = run('terraform output -raw api_url', { cwd: TERRAFORM_DIR });
    // Extract region from API URL
    const regionMatch = region.match(/\.([a-z]+-[a-z]+-\d+)\./);
    region = regionMatch ? regionMatch[1] : 'eu-central-1';
  } catch {
    console.error('\nERROR: Could not get Terraform outputs.');
    console.error('Make sure the infrastructure is deployed: cd terraform/environments/dev && terraform apply\n');

    // Fallback: ask for manual input
    userPoolId = await prompt('Enter User Pool ID manually (or Ctrl+C to exit): ');
    region = await prompt('Enter AWS region (default: eu-central-1): ') || 'eu-central-1';
  }

  if (!userPoolId) {
    console.error('ERROR: User Pool ID is required.');
    process.exit(1);
  }

  console.log(`User Pool ID: ${userPoolId}`);
  console.log(`Region: ${region}\n`);

  // Step 2: Get user details
  const email = await prompt('Email address: ');

  // Validate email domain
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    console.error(`\nERROR: Email must be from one of: ${ALLOWED_DOMAINS.map(d => '@' + d).join(', ')}`);
    process.exit(1);
  }

  const name = await prompt('Full name: ');
  if (!name) {
    console.error('\nERROR: Name is required.');
    process.exit(1);
  }

  const password = await prompt('Password (min 8 chars, upper+lower+number+symbol): ', true);
  const pwErrors = validatePassword(password);
  if (pwErrors.length > 0) {
    console.error(`\nERROR: Password must contain ${pwErrors.join(', ')}.`);
    process.exit(1);
  }

  console.log('\n--- Creating admin user ---\n');

  // Step 3: Create user in Cognito
  try {
    console.log('1. Creating user in Cognito...');
    run(`aws cognito-idp admin-create-user --user-pool-id "${userPoolId}" --username "${email}" --user-attributes Name=email,Value="${email}" Name=email_verified,Value=true Name=name,Value="${name}" --message-action SUPPRESS --region ${region}`);
    console.log('   Done.\n');
  } catch (err) {
    if (err.stderr?.includes('UsernameExistsException')) {
      console.log('   User already exists, continuing...\n');
    } else {
      console.error(`   FAILED: ${err.stderr || err.message}`);
      process.exit(1);
    }
  }

  // Step 4: Set permanent password
  try {
    console.log('2. Setting permanent password...');
    run(`aws cognito-idp admin-set-user-password --user-pool-id "${userPoolId}" --username "${email}" --password "${password}" --permanent --region ${region}`);
    console.log('   Done.\n');
  } catch (err) {
    console.error(`   FAILED: ${err.stderr || err.message}`);
    process.exit(1);
  }

  // Step 5: Add to Admins group
  try {
    console.log('3. Adding to Admins group...');
    run(`aws cognito-idp admin-add-user-to-group --user-pool-id "${userPoolId}" --username "${email}" --group-name Admins --region ${region}`);
    console.log('   Done.\n');
  } catch (err) {
    console.error(`   FAILED: ${err.stderr || err.message}`);
    process.exit(1);
  }

  // Step 6: Also create user in DynamoDB Users table
  try {
    console.log('4. Creating user record in DynamoDB...');
    const usersTable = run('terraform output -raw users_table_name', { cwd: TERRAFORM_DIR });

    // Get the user's sub (userId)
    const userInfo = run(`aws cognito-idp admin-get-user --user-pool-id "${userPoolId}" --username "${email}" --region ${region}`);
    const parsed = JSON.parse(userInfo);
    const sub = parsed.UserAttributes.find(a => a.Name === 'sub')?.Value;

    if (sub && usersTable) {
      const now = new Date().toISOString();
      const item = JSON.stringify({
        userId: { S: sub },
        email: { S: email },
        name: { S: name },
        role: { S: 'ADMIN' },
        isActive: { BOOL: true },
        createdAt: { S: now },
        updatedAt: { S: now }
      });
      run(`aws dynamodb put-item --table-name "${usersTable}" --item "${item.replace(/"/g, '\\"')}" --region ${region}`);
      console.log('   Done.\n');
    }
  } catch (err) {
    console.log(`   Skipped (non-critical): ${err.message}\n`);
  }

  console.log('============================================');
  console.log('  Admin user created successfully!');
  console.log('============================================');
  console.log(`  Email:    ${email}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Role:     Administrator`);
  console.log(`  Password: (as entered)`);
  console.log('');
  console.log('  You can now log in at http://localhost:3000');
  console.log('============================================\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
