# Amplify Deployment Fix

## Issue
Your Amplify app was deployed to a different AWS account than your current CLI configuration.

## Solution: Redeploy Infrastructure

```bash
# 1. Navigate to Terraform directory
cd terraform/environments/dev

# 2. Destroy existing infrastructure (in old account)
# Skip this if you don't have access to the old account

# 3. Redeploy with current AWS account
terraform init
terraform plan
terraform apply -auto-approve

# 4. Trigger Amplify deployment
aws amplify start-job \
  --app-id $(terraform output -raw amplify_url | grep -oP 'd[a-z0-9]+(?=\.amplifyapp)') \
  --branch-name main \
  --job-type RELEASE \
  --region eu-central-1
```

## Alternative: Manual Deployment via AWS Console

1. Go to AWS Amplify Console: https://eu-central-1.console.aws.amazon.com/amplify/
2. Find your app: `tms-dev-frontend-*`
3. Click on the app
4. Click "Run build" or "Redeploy this version"
5. Wait for deployment to complete

## Verify Deployment

```bash
# Check deployment status
aws amplify list-jobs \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-central-1 \
  --max-results 1
```

## Update Frontend Environment

After successful deployment, update your frontend `.env`:

```bash
cd frontend
cat > .env << EOF
REACT_APP_API_URL=$(cd ../terraform/environments/dev && terraform output -raw api_url)
REACT_APP_COGNITO_USER_POOL_ID=$(cd ../terraform/environments/dev && terraform output -raw cognito_user_pool_id)
REACT_APP_COGNITO_CLIENT_ID=$(cd ../terraform/environments/dev && terraform output -raw cognito_client_id)
REACT_APP_COGNITO_DOMAIN=$(cd ../terraform/environments/dev && terraform output -raw cognito_domain)
REACT_APP_AWS_REGION=eu-central-1
EOF
```
