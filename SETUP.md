# Setup & Deployment Guide

Step-by-step instructions to deploy the Serverless Task Management System and verify everything works.

---

## Prerequisites

Before starting, make sure you have:

- **Node.js** v18+ installed (`node --version`)
- **npm** v9+ installed (`npm --version`)
- **Terraform** v1.5+ installed (`terraform --version`)
- **AWS CLI** v2 configured with credentials (`aws sts get-caller-identity`)
- Your AWS account must have permissions for: Lambda, DynamoDB, Cognito, API Gateway, SES, Amplify, IAM, CloudWatch

---

## Step 1: Build the Lambda Layer

The backend shared code and dependencies are packaged into a Lambda layer. This must be built before Terraform runs.

```bash
# From the project root
node scripts/build.js
```

**Expected output:**
```
=== Building Lambda Layer ===

1. Cleaning build directory...
2. Installing production dependencies...
   added 90 packages ...
3. Copying shared backend code...

=== Layer build complete ===
Layer structure:
  \-- nodejs/
      |-- node_modules/ (26 packages)
      \-- shared/
          |-- services/
          |   |-- cognito.js
          |   |-- dynamodb.js
          |   \-- email.js
          \-- utils/
              \-- response.js
```

**Verify:**
- `build/layer/nodejs/node_modules/` exists and contains `@aws-sdk` packages
- `build/layer/nodejs/shared/services/cognito.js` exists
- `build/layer/nodejs/shared/utils/response.js` exists

---

## Step 2: Configure Terraform Variables

```bash
cd terraform/environments/dev
```

Edit `main.tf` and update:

| Variable | What to set |
|---|---|
| `aws_region` | Your AWS region (e.g., `eu-central-1`) |
| `ses_from_email` | A verified SES email address |
| `admin_email` | Your admin email address |
| `frontend_repository_url` | Your GitHub repo URL (for Amplify) |
| `github_access_token` | A GitHub PAT with repo access |
| `cors_allowed_origins` | Add your Amplify domain once deployed |

---

## Step 3: Deploy Infrastructure with Terraform

```bash
cd terraform/environments/dev

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply (type "yes" when prompted)
terraform apply
```

**Expected: ~40-50 resources created** including:
- 1 Cognito User Pool + Client + Domain
- 3 DynamoDB tables (Tasks, Users, Assignments)
- 9 Lambda functions + 1 Lambda layer
- 1 API Gateway REST API with routes
- SES email identities
- 1 Amplify app

**Save the outputs** - you'll need them for the frontend:
```bash
terraform output
```

Key outputs to note:
- `api_url` - Your API Gateway endpoint
- `cognito_user_pool_id` - User Pool ID
- `cognito_client_id` - Client ID
- `cognito_domain` - Auth domain
- `frontend_config` - All frontend config in one object

---

## Step 4: Verify SES Email

SES starts in sandbox mode. You must verify email addresses before sending.

```bash
# Check verification status
aws ses get-identity-verification-attributes \
  --identities "your-ses-from-email@amalitech.com" \
  --region eu-central-1
```

If not verified, check the verification email in your inbox and click the link. In sandbox mode, you also need to verify every recipient email address.

To request production access (to send to any email):
```bash
aws ses put-account-details \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url "https://your-app-url" \
  --use-case-description "Task management notifications"
```

---

## Step 5: Test the Backend (API)

### 5.1 Create an Admin User

Use the provided script to create an admin user. It automatically fetches the User Pool ID from Terraform, creates the user in Cognito, sets a permanent password, adds them to the Admins group, and creates a DynamoDB record.

```bash
# From the project root
bash scripts/create-admin.sh
```

The script will prompt you for:
- **Email** - Must be `@amalitech.com` or `@amalitechtraining.org`
- **Full name**
- **Password** - Min 8 chars, must include uppercase, lowercase, number, and special character

### 5.2 Get an Auth Token

```bash
CLIENT_ID=$(cd terraform/environments/dev && terraform output -raw cognito_client_id)

# Authenticate and get token
aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=admin@amalitech.com,PASSWORD=YourPassword1! \
  --region eu-central-1
```

Copy the `IdToken` from the response. Save it:
```bash
TOKEN="<paste-your-id-token-here>"
```

### 5.3 Test API Endpoints

```bash
API_URL=$(cd terraform/environments/dev && terraform output -raw api_gateway_url)

# Test: Create a task (POST /tasks)
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Testing the API","priority":"HIGH"}'
```

**Expected:** `201` response with task object containing `taskId`.

```bash
# Test: Get all tasks (GET /tasks)
curl -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `200` response with `tasks` array containing the task you just created.

```bash
# Test: Get single task (GET /tasks/{id})
TASK_ID="<taskId-from-create-response>"
curl -X GET "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `200` response with the task details.

```bash
# Test: Update task status (PUT /tasks/{id}/status)
curl -X PUT "$API_URL/tasks/$TASK_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'
```

**Expected:** `200` with `previousStatus: "OPEN"` and updated task.

```bash
# Test: Get users (GET /users)
curl -X GET "$API_URL/users" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `200` with list of Cognito users.

```bash
# Test: Delete task (DELETE /tasks/{id})
curl -X DELETE "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `200` with `"Task deleted successfully"`.

### 5.4 Test Authorization (should fail)

```bash
# Test without token (should return 401)
curl -X GET "$API_URL/tasks"
```

**Expected:** `401 Unauthorized` from API Gateway.

---

## Step 6: Verify Lambda Layer is Working

If any API call returns a `500` error with `"Cannot find module"`, the layer is not packaged correctly.

Check CloudWatch logs:
```bash
# Get function name
FUNC_NAME=$(cd terraform/environments/dev && terraform output -json lambda_function_names | jq -r '.get_tasks')

# View recent logs
aws logs tail "/aws/lambda/$FUNC_NAME" --since 5m --region eu-central-1
```

**What to look for:**
- If you see `Cannot find module '/opt/nodejs/shared/utils/response'` - rebuild the layer: `node scripts/build.js` then `terraform apply`
- If you see `Cannot find module '@aws-sdk/client-dynamodb'` - same fix, rebuild layer

---

## Step 7: Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local from the example
cp .env.example .env.local
```

Edit `frontend/.env.local` with Terraform outputs:
```bash
# Get all values at once
cd ../terraform/environments/dev
terraform output frontend_config
```

Fill in `.env.local`:
```env
REACT_APP_API_URL=https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/dev
REACT_APP_USER_POOL_ID=eu-central-1_xxxxxxxxx
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_COGNITO_DOMAIN=tms-dev-auth-xxxxxxxx.auth.eu-central-1.amazoncognito.com
REACT_APP_AWS_REGION=eu-central-1
```

### Start the frontend locally:
```bash
cd frontend
npm start
```

**Expected:** App opens at `http://localhost:3000`.

---

## Step 8: Test End-to-End in the Browser

### 8.1 Login
1. Go to `http://localhost:3000`
2. Log in with the admin user created in Step 5.1
3. **Expected:** Redirected to Dashboard showing task statistics

### 8.2 Create a Task
1. Navigate to **Tasks** page
2. Click **Create Task**
3. Fill in title, description, priority, due date
4. Click **Create**
5. **Expected:** Task appears in the task list with status "OPEN"

### 8.3 Assign a Task
1. Create a member user first (via Cognito or the signup form)
2. Open a task
3. Click **Assign**
4. Select a member
5. **Expected:** Member is assigned; check their email for assignment notification (SES must be configured)

### 8.4 Update Task Status
1. Open a task
2. Change status to "IN_PROGRESS"
3. **Expected:** Status updates; notification emails sent to involved users

### 8.5 Test as Member
1. Log out
2. Log in as a member user
3. **Expected:** Can only see assigned tasks, cannot create/delete tasks, cannot close tasks

---

## Step 9: Verify Post-Confirmation Trigger

1. Sign up a new user through the frontend with an `@amalitech.com` or `@amalitechtraining.org` email
2. Enter the verification code sent to the email
3. **Expected (check in AWS Console):**
   - User appears in DynamoDB `Users` table
   - User is added to `Members` group in Cognito

```bash
# Verify user was added to DynamoDB
USERS_TABLE=$(cd terraform/environments/dev && terraform output -raw users_table_name)
aws dynamodb scan --table-name $USERS_TABLE --region eu-central-1
```

---

## Step 10: Verify Email Notifications

For this to work, SES must have verified the sender email AND recipient emails (in sandbox mode).

1. Assign a task to a member (Step 8.3)
2. Check the member's email inbox
3. **Expected:** HTML email with task title, description, priority, due date, and assigner name

4. Update a task status (Step 8.4)
5. Check emails for all involved users (admins + assigned members + creator)
6. **Expected:** HTML email showing old status -> new status with updater name

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `terraform apply` fails on `null_resource.build_layer` | Run `node scripts/build.js` manually first, then retry |
| Lambda returns `Cannot find module` | Rebuild layer: `node scripts/build.js` then `terraform apply` |
| `403 Forbidden` on API calls | Check the user is in the correct Cognito group (Admins/Members) |
| `401 Unauthorized` | Token may have expired (1 hour). Re-authenticate to get a new token |
| Emails not sending | Verify SES email addresses. Check CloudWatch logs for SES errors |
| CORS errors in browser | Ensure `cors_allowed_origins` in Terraform includes your frontend URL |
| Signup fails with "Email domain not allowed" | Only `@amalitech.com` and `@amalitechtraining.org` domains are allowed |
| Frontend shows blank/errors | Check `.env.local` values match `terraform output frontend_config` |
| `circular dependency` in Terraform | Run `terraform apply` again - the dependency resolves on second run |

---

## Clean Up

To destroy all resources:
```bash
cd terraform/environments/dev
terraform destroy
```

To clean build artifacts locally:
```bash
# Remove build output
rm -rf build/

# Remove generated zips
rm -rf terraform/modules/lambda/functions/
rm -f terraform/modules/lambda/lambda_layer.zip
```
