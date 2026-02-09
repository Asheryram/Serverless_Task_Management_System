#!/usr/bin/env node

// Test script to update task status and check email notifications
// Usage: node test-status-update.js <taskId> <newStatus> <authToken>

const https = require('https');

const API_URL = 'https://q60vvgkbq2.execute-api.eu-central-1.amazonaws.com/dev';
const taskId = process.argv[2];
const newStatus = process.argv[3];
const authToken = process.argv[4];

if (!taskId || !newStatus || !authToken) {
  console.error('Usage: node test-status-update.js <taskId> <newStatus> <authToken>');
  console.error('Example: node test-status-update.js abc123 IN_PROGRESS eyJraWQ...');
  console.error('\nValid statuses: OPEN, IN_PROGRESS, COMPLETED, CLOSED');
  process.exit(1);
}

const url = new URL(`${API_URL}/tasks/${taskId}/status`);
const body = JSON.stringify({ status: newStatus });

const options = {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log(`\nUpdating task ${taskId} to status: ${newStatus}\n`);

const req = https.request(url, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`);
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (res.statusCode === 200) {
        console.log('\n✓ Status updated successfully!');
        console.log('\nNext steps:');
        console.log('1. Check CloudWatch Logs:');
        console.log('   aws logs tail /aws/lambda/tms-dev-update-status-ff1db3da --follow');
        console.log('2. Look for messages like "Email sent to: [email]"');
        console.log('3. Check recipient email inbox (and spam folder)');
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(body);
req.end();
