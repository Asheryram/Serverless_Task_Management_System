# End-to-End Testing Guide

## 🎯 Complete Deployment & Testing Flow

### Prerequisites Checklist

- [ ] AWS CLI installed and configured
- [ ] Terraform >= 1.5.0 installed
- [ ] Node.js >= 18.x installed
- [ ] AWS credentials configured (`aws configure`)
- [ ] Email verified in AWS SES (yram.tetteh-abotsi@amalitech.com)

---

## 📋 Step-by-Step Testing

### Phase 1: Build Lambda Layer

**Windows:**
```cmd
cd C:\path\to\Serverless_Task_Management_System\scripts
build-layer.bat
```

**Linux/Mac/WSL:**
```bash
cd /home/sage/Serverless_Task_Management_System/scripts
chmod +x build-layer.sh
./build-layer.sh
```

**✅ Verify:**
```bash
# Check layer structure was created
ls -la ../terraform/modules/lambda/layer/nodejs/node_modules/shared/

# Should see:
# services/
# utils/
```

---

### Phase 2: Deploy Infrastructure

```bash
cd ../terraform/environments/dev

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy (type 'yes' when prompted)
terraform apply
```

**⏱️ Expected time:** 5-10 minutes

**✅ Verify outputs:**
```bash
terraform output

# Should show:
# api_url = "https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/dev"
# cognito_user_pool_id = "eu-central-1_xxxxxxxxx"
# cognito_client_id = "xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Save these values!** You'll need them for testing.

---

### Phase 3: Verify AWS Resources

**Check Lambda Functions:**
```bash
aws lambda list-functions --query 'Functions[?contains(FunctionName, `task-mgmt`)].FunctionName'
```

**Expected output:**
```json
[
  "task-mgmt-create-task-dev",
  "task-mgmt-get-tasks-dev",
  "task-mgmt-assign-task-dev",
  ...
]
```

**Check Lambda Layer:**
```bash
aws lambda list-layers --query 'Layers[?contains(LayerName, `shared-services`)].LayerName'
```

**Check if layer is attached:**
```bash
aws lambda get-function --function-name task-mgmt-create-task-dev --query 'Configuration.Layers'
```

**Should show layer ARN!**

---

### Phase 4: Create Test Users

**Option A: AWS Console**
1. Go to AWS Cognito Console
2. Select your User Pool
3. Create user with email: `test-admin@amalitech.com`
4. Create user with email: `test-member@amalitech.com`
5. Verify emails and set passwords

**Option B: AWS CLI**
```bash
# Get User Pool ID from terraform output
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username test-admin@amalitech.com \
  --user-attributes Name=email,Value=test-admin@amalitech.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Add to Admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username test-admin@amalitech.com \
  --group-name Admins

# Create member user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username test-member@amalitech.com \
  --user-attributes Name=email,Value=test-member@amalitech.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Add to Members group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username test-member@amalitech.com \
  --group-name Members
```

---

### Phase 5: Get Authentication Token

**Install AWS Amplify CLI (if needed):**
```bash
npm install -g @aws-amplify/cli
```

**Or use this Node.js script:**

Create `test-auth.js`:
```javascript
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

async function getToken(username, password, clientId) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password
    }
  });
  
  const response = await client.send(command);
  return response.AuthenticationResult.IdToken;
}

// Usage
const CLIENT_ID = 'your-client-id-from-terraform-output';
getToken('test-admin@amalitech.com', 'YourPassword123!', CLIENT_ID)
  .then(token => console.log('Token:', token))
  .catch(err => console.error('Error:', err));
```

**Run:**
```bash
npm install @aws-sdk/client-cognito-identity-provider
node test-auth.js
```

**Save the token!**

---

### Phase 6: Test API Endpoints

**Set variables:**
```bash
API_URL="https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/dev"
TOKEN="your-id-token-from-previous-step"
```

**Test 1: Create Task (Admin only)**
```bash
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task from Layer",
    "description": "Testing Lambda Layer implementation",
    "priority": "HIGH",
    "dueDate": "2024-12-31"
  }'
```

**✅ Expected:** 201 Created with task object

**Test 2: Get All Tasks**
```bash
curl -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Expected:** 200 OK with array of tasks

**Test 3: Get Single Task**
```bash
TASK_ID="task-id-from-create-response"

curl -X GET "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Expected:** 200 OK with task details

**Test 4: Assign Task**
```bash
# Get member user ID first
MEMBER_ID=$(aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username test-member@amalitech.com \
  --query 'UserAttributes[?Name==`sub`].Value' \
  --output text)

curl -X POST "$API_URL/tasks/$TASK_ID/assign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"memberIds\": [\"$MEMBER_ID\"]}"
```

**✅ Expected:** 200 OK + Email sent to member

**Test 5: Update Status**
```bash
curl -X PUT "$API_URL/tasks/$TASK_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

**✅ Expected:** 200 OK + Email notifications sent

**Test 6: Get Users (Admin only)**
```bash
curl -X GET "$API_URL/users" \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Expected:** 200 OK with list of users

**Test 7: Update Task**
```bash
curl -X PUT "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Task Title",
    "priority": "MEDIUM"
  }'
```

**✅ Expected:** 200 OK with updated task

**Test 8: Delete Task**
```bash
curl -X DELETE "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Expected:** 200 OK

---

### Phase 7: Verify Lambda Layer is Working

**Check CloudWatch Logs:**
```bash
# Get latest log stream for create-task function
aws logs tail /aws/lambda/task-mgmt-create-task-dev --follow

# Look for:
# ✅ No "Cannot find module" errors
# ✅ "Task created: <task-id>" messages
# ✅ No import errors
```

**Check Lambda function details:**
```bash
aws lambda get-function --function-name task-mgmt-create-task-dev

# Verify:
# - CodeSize is small (~5-10 KB, not 500 KB)
# - Layers array contains shared-services layer ARN
```

---

### Phase 8: Test Email Notifications

**Check SES:**
```bash
# Verify email identity
aws ses get-identity-verification-attributes \
  --identities yram.tetteh-abotsi@amalitech.com
```

**Test email sending:**
1. Assign a task to a member
2. Check member's email inbox
3. Should receive "Task Assigned" email

4. Update task status
5. Check admin and member emails
6. Should receive "Task Status Updated" email

---

### Phase 9: Performance Testing

**Test cold start time:**
```bash
# Invoke function and measure time
time curl -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** < 2 seconds (with layer, faster than bundled)

**Test concurrent requests:**
```bash
# Run 10 concurrent requests
for i in {1..10}; do
  curl -X GET "$API_URL/tasks" \
    -H "Authorization: Bearer $TOKEN" &
done
wait
```

**✅ All should succeed**

---

### Phase 10: Verify Layer Updates

**Test updating shared services:**

1. **Edit a service:**
```bash
# Edit backend/src/services/dynamodb.js
# Add a console.log("Using Lambda Layer v2!")
```

2. **Rebuild layer:**
```bash
cd scripts
./build-layer.sh
```

3. **Redeploy:**
```bash
cd ../terraform/environments/dev
terraform apply
```

4. **Test API:**
```bash
curl -X GET "$API_URL/tasks" -H "Authorization: Bearer $TOKEN"
```

5. **Check logs:**
```bash
aws logs tail /aws/lambda/task-mgmt-get-tasks-dev --follow
```

**✅ Should see:** "Using Lambda Layer v2!" in logs

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'shared/services/dynamodb'"

**Fix:**
```bash
# Rebuild layer
cd scripts
./build-layer.sh

# Verify structure
ls -la ../terraform/modules/lambda/layer/nodejs/node_modules/shared/

# Redeploy
cd ../terraform/environments/dev
terraform apply
```

### Error: "User is not authorized"

**Fix:**
```bash
# Check user is in correct group
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id $USER_POOL_ID \
  --username test-admin@amalitech.com

# Add to group if missing
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username test-admin@amalitech.com \
  --group-name Admins
```

### Error: "Email not verified"

**Fix:**
```bash
# Verify email in SES
aws ses verify-email-identity \
  --email-address yram.tetteh-abotsi@amalitech.com

# Check verification status
aws ses get-identity-verification-attributes \
  --identities yram.tetteh-abotsi@amalitech.com
```

### Lambda function timing out

**Fix:**
```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/task-mgmt-create-task-dev --follow

# Increase timeout in Terraform if needed
# Edit terraform/modules/lambda/main.tf
# Change: timeout = 30 to timeout = 60
```

---

## ✅ Success Checklist

- [ ] Layer built successfully
- [ ] Terraform deployed without errors
- [ ] All 9 Lambda functions created
- [ ] Lambda Layer attached to all functions
- [ ] Users created in Cognito
- [ ] Authentication token obtained
- [ ] Create task works (201)
- [ ] Get tasks works (200)
- [ ] Assign task works + email sent
- [ ] Update status works + email sent
- [ ] Get users works (200)
- [ ] Update task works (200)
- [ ] Delete task works (200)
- [ ] No "Cannot find module" errors in logs
- [ ] Lambda package size is small (~5-10 KB)
- [ ] Layer update propagates to all functions

---

## 📊 Expected Results Summary

| Test | Expected Result | Success Indicator |
|------|----------------|-------------------|
| Build Layer | Layer structure created | `shared/services/` exists |
| Terraform Apply | All resources created | 9 Lambdas + 1 Layer |
| Create Task | 201 Created | Task object returned |
| Get Tasks | 200 OK | Array of tasks |
| Assign Task | 200 OK + Email | Member receives email |
| Update Status | 200 OK + Emails | Notifications sent |
| CloudWatch Logs | No errors | No "Cannot find module" |
| Package Size | ~5-10 KB | Not 500 KB |
| Layer Attached | Layer ARN present | `aws lambda get-function` |

---

## 🎉 You're Done!

If all tests pass, your Lambda Layer implementation is working perfectly!

**Next steps:**
- Deploy frontend
- Add more test cases
- Monitor CloudWatch metrics
- Set up CI/CD pipeline
