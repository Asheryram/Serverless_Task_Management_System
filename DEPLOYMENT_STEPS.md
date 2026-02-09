# Deployment Guide - Step by Step

## Overview

You handle Terraform deployment/destroy. This guide covers the tasks you need to do **before** and **after** Terraform.

---

## BEFORE Terraform Deploy

### Task 1: Build Lambda Layer (REQUIRED)

**Why:** Lambda functions need shared services bundled in a layer.

**Windows:**
```cmd
cd scripts
build-layer.bat
```

**Linux/Mac/WSL:**
```bash
cd scripts
chmod +x build-layer.sh
./build-layer.sh
```

**What it does:**
- Copies `backend/src/services/` → `terraform/modules/lambda/layer/nodejs/node_modules/shared/services/`
- Copies `backend/src/utils/` → `terraform/modules/lambda/layer/nodejs/node_modules/shared/utils/`
- Creates `package.json` for the layer

**Verify:**
```bash
ls terraform/modules/lambda/layer/nodejs/node_modules/shared/
# Should show: services/ and utils/
```

**✅ Done!** Now run your Terraform deployment.

---

## AFTER Terraform Deploy

### Task 2: Verify Email in SES (REQUIRED for email notifications)

**Option A: Using the script (Interactive)**
```bash
cd scripts
chmod +x setup-ses.sh
./setup-ses.sh
```

**Option B: Manual AWS CLI**
```bash
# Verify your email
aws ses verify-email-identity --email-address yram.tetteh-abotsi@amalitech.com --region eu-central-1

# Check your email inbox and click the verification link

# Verify it worked
aws ses get-identity-verification-attributes \
  --identities yram.tetteh-abotsi@amalitech.com \
  --region eu-central-1
```

**Option C: AWS Console**
1. Go to AWS SES Console
2. Click "Verified identities"
3. Click "Create identity"
4. Enter: yram.tetteh-abotsi@amalitech.com
5. Check email and click verification link

---

### Task 3: Create Admin User (REQUIRED to use the app)

**Get Terraform outputs first:**
```bash
cd terraform/environments/dev
export USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
export CLIENT_ID=$(terraform output -raw cognito_client_id)
export API_URL=$(terraform output -raw api_url)
```

**Option A: Using the script (Interactive)**
```bash
cd ../../scripts
chmod +x create-admin.sh
./create-admin.sh

# When prompted:
# Email: admin@amalitech.com (or your @amalitech.com email)
# Name: Your Name
# Password: YourSecurePassword123!
```

**Option B: Manual AWS CLI**
```bash
# Create user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@amalitech.com \
  --user-attributes Name=email,Value=admin@amalitech.com Name=email_verified,Value=true Name=name,Value="Admin User" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Add to Admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@amalitech.com \
  --group-name Admins

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@amalitech.com \
  --password "AdminPass123!" \
  --permanent
```

---

### Task 4: Get Authentication Token (To test API)

**Option A: Using the script (Easiest)**
```bash
cd scripts
chmod +x get-token.sh
./get-token.sh

# When prompted:
# Email: admin@amalitech.com
# Password: AdminPass123!

# Copy the token and export it
export TOKEN="paste-token-here"
```

**Option B: Manual with Node.js**
```javascript
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

async function getToken() {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.CLIENT_ID,
    AuthParameters: {
      USERNAME: 'admin@amalitech.com',
      PASSWORD: 'AdminPass123!'
    }
  });
  
  const response = await client.send(command);
  console.log(response.AuthenticationResult.IdToken);
}

getToken().catch(console.error);
```

**Run it:**
```bash
# Install dependency (one time)
npm install @aws-sdk/client-cognito-identity-provider

# Get token
CLIENT_ID=$CLIENT_ID node get-token.js

# Save the token
export TOKEN="paste-the-long-token-here"
```

---

### Task 5: Test the API (Verify everything works)

**Quick test:**
```bash
# Test 1: Get all tasks (should return empty array)
curl -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Create a task
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Testing deployment",
    "priority": "HIGH"
  }'

# Test 3: Get users
curl -X GET "$API_URL/users" \
  -H "Authorization: Bearer $TOKEN"
```

**Or use the automated test script:**
```bash
cd scripts
chmod +x test-api.sh

# Set environment variables
export API_URL="your-api-url"
export TOKEN="your-token"

# Run tests
./test-api.sh
```

---

### Task 6: Verify Lambda Layer is Working

**Check CloudWatch Logs:**
```bash
# Tail logs for create-task function
aws logs tail /aws/lambda/task-mgmt-create-task-dev --follow

# In another terminal, create a task (see Test 2 above)
# Watch the logs - should see NO "Cannot find module" errors
```

**Check Lambda function has layer:**
```bash
aws lambda get-function \
  --function-name task-mgmt-create-task-dev \
  --query 'Configuration.Layers'

# Should show layer ARN
```

**Check Lambda package size:**
```bash
aws lambda get-function \
  --function-name task-mgmt-create-task-dev \
  --query 'Configuration.CodeSize'

# Should be small (~5-10 KB, not 500 KB)
```

---

## Complete Workflow Summary

```
1. Build Lambda Layer
   ↓
2. Run Terraform Apply (YOU DO THIS)
   ↓
3. Verify Email in SES
   ↓
4. Create Admin User
   ↓
5. Get Auth Token
   ↓
6. Test API
   ↓
7. Verify Logs
```

---

## When You Update Services

If you modify `backend/src/services/*.js` or `backend/src/utils/*.js`:

```bash
# 1. Rebuild layer
cd scripts
./build-layer.sh

# 2. Redeploy with Terraform
cd ../terraform/environments/dev
terraform apply

# Done! All Lambda functions automatically use updated code
```

---

## Quick Reference Commands

```bash
# Build layer (before terraform)
cd scripts && ./build-layer.sh

# After terraform, get outputs
cd terraform/environments/dev
terraform output

# Verify email
aws ses verify-email-identity --email-address your-email@amalitech.com --region eu-central-1

# Create admin
cd ../../scripts && ./create-admin.sh

# Get token
CLIENT_ID="from-terraform-output" node get-token.js

# Test API
curl -X GET "$API_URL/tasks" -H "Authorization: Bearer $TOKEN"

# Check logs
aws logs tail /aws/lambda/task-mgmt-create-task-dev --follow
```

---

## Troubleshooting

**"Cannot find module 'shared/services/dynamodb'" in logs:**
```bash
# Rebuild layer and redeploy
cd scripts
./build-layer.sh
cd ../terraform/environments/dev
terraform apply
```

**"Email not verified" when testing notifications:**
```bash
# Check verification status
aws ses get-identity-verification-attributes \
  --identities yram.tetteh-abotsi@amalitech.com \
  --region eu-central-1

# If not verified, verify again
aws ses verify-email-identity \
  --email-address yram.tetteh-abotsi@amalitech.com \
  --region eu-central-1
```

**"Unauthorized" when calling API:**
- Token expired (get new one with `node get-token.js`)
- User not in Admins group (check with `aws cognito-idp admin-list-groups-for-user`)

**Layer not attached to Lambda:**
```bash
# Check Terraform applied the layer
aws lambda get-function --function-name task-mgmt-create-task-dev --query 'Configuration.Layers'

# If empty, check terraform/modules/lambda/main.tf has:
# layers = [aws_lambda_layer_version.shared_services.arn]
```

---

## Files You Need

**Scripts (already exist):**
- ✅ `scripts/build-layer.sh` - Build Lambda Layer
- ✅ `scripts/setup-ses.sh` - Setup email
- ✅ `scripts/create-admin.sh` - Create admin user
- ✅ `scripts/test-api.sh` - Test API endpoints

**You need to create:**
- `get-token.js` - Get authentication token (see Task 4)

---

## That's It!

**Before Terraform:** Build layer  
**After Terraform:** Setup email, create admin, test

Total time: ~5 minutes (excluding Terraform deployment time)
