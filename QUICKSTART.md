# 🚀 Quick Start Guide - Run the App from Start to Finish

## Prerequisites (5 minutes)

1. **Install required tools:**
   - AWS CLI: https://aws.amazon.com/cli/
   - Terraform: https://www.terraform.io/downloads
   - Node.js 18+: https://nodejs.org/

2. **Configure AWS credentials:**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Region: eu-central-1
   ```

3. **Verify email in AWS SES:**
   ```bash
   aws ses verify-email-identity --email-address yram.tetteh-abotsi@amalitech.com
   # Check your email and click verification link
   ```

---

## Step 1: Build Lambda Layer (1 minute)

```bash
cd Serverless_Task_Management_System/scripts

# Windows:
build-layer.bat

# Linux/Mac/WSL:
chmod +x build-layer.sh
./build-layer.sh
```

**✅ Success:** You'll see "Layer structure created successfully!"

---

## Step 2: Deploy Infrastructure (5-10 minutes)

```bash
cd ../terraform/environments/dev

# Initialize Terraform
terraform init

# Deploy everything
terraform apply
# Type 'yes' when prompted
```

**✅ Success:** You'll see outputs with API URL and Cognito IDs

**Save these values:**
```bash
# Copy these from terraform output
export API_URL=$(terraform output -raw api_url)
export USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
export CLIENT_ID=$(terraform output -raw cognito_client_id)
```

---

## Step 3: Create Admin User (1 minute)

**Use the provided script:**
```bash
cd ../../scripts
chmod +x create-admin.sh
./create-admin.sh

# When prompted:
# Email: admin@amalitech.com
# Name: Admin User
# Password: AdminPass123!
```

**Or manually with AWS CLI:**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@amalitech.com \
  --user-attributes Name=email,Value=admin@amalitech.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@amalitech.com \
  --group-name Admins

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@amalitech.com \
  --password "AdminPass123!" \
  --permanent
```

**✅ Success:** You'll see "Admin User Created!"

---

## Step 4: Get Authentication Token (2 minutes)

**Create a file `get-token.js`:**
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
npm install @aws-sdk/client-cognito-identity-provider
node get-token.js
```

**Copy the token and save it:**
```bash
export TOKEN="paste-your-token-here"
```

---

## Step 5: Test the API (2 minutes)

**Test 1: Create a task**
```bash
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Task",
    "description": "Testing the app",
    "priority": "HIGH"
  }'
```

**✅ Success:** You'll get a 201 response with task details

**Test 2: Get all tasks**
```bash
curl -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Success:** You'll see your task in the list

**Test 3: Get users**
```bash
curl -X GET "$API_URL/users" \
  -H "Authorization: Bearer $TOKEN"
```

**✅ Success:** You'll see the admin user

---

## Step 6: Verify Lambda Layer is Working

```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/task-mgmt-create-task-dev --follow

# In another terminal, create a task (repeat Test 1 above)
# Watch the logs - should see no "Cannot find module" errors
```

**✅ Success:** Logs show task creation without errors

---

## 🎉 You're Done!

Your serverless task management system is now running!

### What You Have:

- ✅ 9 Lambda functions deployed
- ✅ Lambda Layer with shared services
- ✅ DynamoDB tables for tasks and users
- ✅ Cognito user pool with admin user
- ✅ API Gateway with authentication
- ✅ SES configured for email notifications

### Quick Commands Reference:

```bash
# Create task
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task Name","description":"Details","priority":"HIGH"}'

# Get all tasks
curl -X GET "$API_URL/tasks" -H "Authorization: Bearer $TOKEN"

# Get single task
curl -X GET "$API_URL/tasks/{taskId}" -H "Authorization: Bearer $TOKEN"

# Update task
curl -X PUT "$API_URL/tasks/{taskId}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title","priority":"LOW"}'

# Update status
curl -X PUT "$API_URL/tasks/{taskId}/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# Delete task
curl -X DELETE "$API_URL/tasks/{taskId}" -H "Authorization: Bearer $TOKEN"

# Get users (admin only)
curl -X GET "$API_URL/users" -H "Authorization: Bearer $TOKEN"
```

---

## 🔄 To Update Services:

```bash
# 1. Edit backend/src/services/*.js
# 2. Rebuild layer
cd scripts
./build-layer.sh

# 3. Redeploy
cd ../terraform/environments/dev
terraform apply
```

All Lambda functions automatically use the updated code!

---

## 🧹 To Clean Up (Delete Everything):

```bash
cd terraform/environments/dev
terraform destroy
# Type 'yes' when prompted
```

---

## 📱 Next Steps:

1. **Deploy Frontend:**
   - Update `frontend_repository_url` in `terraform/environments/dev/main.tf`
   - Add GitHub access token
   - Run `terraform apply`

2. **Create More Users:**
   - Use AWS Cognito Console
   - Or repeat Step 3 with different emails

3. **Test Email Notifications:**
   - Create a member user
   - Assign tasks to them
   - Check email inbox for notifications

4. **Monitor:**
   - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/
   - Lambda Functions: https://console.aws.amazon.com/lambda/
   - DynamoDB Tables: https://console.aws.amazon.com/dynamodb/

---

## ⚠️ Troubleshooting:

**"Cannot find module" error:**
```bash
cd scripts
./build-layer.sh
cd ../terraform/environments/dev
terraform apply
```

**"Unauthorized" error:**
- Token expired (get new token with `node get-token.js`)
- User not in correct group (check with AWS Console)

**"Email not verified" error:**
```bash
aws ses verify-email-identity --email-address your-email@amalitech.com
# Check email and click verification link
```

**Terraform errors:**
```bash
# Reset state
terraform init -reconfigure
terraform apply
```

---

## 📊 Architecture Overview:

```
User Request
    ↓
API Gateway (with Cognito Authorizer)
    ↓
Lambda Function (5 KB handler)
    ↓
Lambda Layer (shared services)
    ↓
DynamoDB / Cognito / SES
    ↓
Response
```

**Total deployment time: ~15-20 minutes**

Enjoy your serverless task management system! 🚀
