#!/bin/bash

# Create Admin User Script
# Usage: bash scripts/create-admin.sh
#
# Required: AWS CLI configured with credentials
# Required: Infrastructure already deployed (needs User Pool ID from Terraform output)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform/environments/dev"
ALLOWED_DOMAINS=("amalitech.com" "amalitechtraining.org")

echo ""
echo "============================================"
echo "  Create Admin User"
echo "============================================"
echo ""

# Step 1: Get User Pool ID from Terraform
echo "Fetching User Pool ID from Terraform..."
USER_POOL_ID=$(cd "$TERRAFORM_DIR" && terraform output -raw cognito_user_pool_id 2>/dev/null) || true
API_URL=$(cd "$TERRAFORM_DIR" && terraform output -raw api_gateway_url 2>/dev/null) || true

if [ -n "$API_URL" ]; then
  REGION=$(echo "$API_URL" | grep -oP '\.([a-z]+-[a-z]+-[0-9]+)\.' | tr -d '.')
fi

if [ -z "$USER_POOL_ID" ]; then
  echo ""
  echo "ERROR: Could not get Terraform outputs."
  echo "Make sure the infrastructure is deployed: cd $TERRAFORM_DIR && terraform apply"
  echo ""
  read -rp "Enter User Pool ID manually (or Ctrl+C to exit): " USER_POOL_ID
  read -rp "Enter AWS region (default: eu-central-1): " REGION
fi

REGION=${REGION:-eu-central-1}

if [ -z "$USER_POOL_ID" ]; then
  echo "ERROR: User Pool ID is required."
  exit 1
fi

echo "User Pool ID: $USER_POOL_ID"
echo "Region: $REGION"
echo ""

# Step 2: Get user details
read -rp "Email address: " EMAIL

# Validate email domain
DOMAIN=$(echo "$EMAIL" | awk -F@ '{print tolower($2)}')
VALID_DOMAIN=false
for d in "${ALLOWED_DOMAINS[@]}"; do
  if [ "$DOMAIN" = "$d" ]; then
    VALID_DOMAIN=true
    break
  fi
done

if [ "$VALID_DOMAIN" = false ]; then
  echo ""
  echo "ERROR: Email must be from one of: @amalitech.com, @amalitechtraining.org"
  exit 1
fi

read -rp "Full name: " NAME

if [ -z "$NAME" ]; then
  echo "ERROR: Name is required."
  exit 1
fi

read -rsp "Password (min 8 chars, upper+lower+number+symbol): " PASSWORD
echo ""

# Validate password
ERRORS=""
if [ ${#PASSWORD} -lt 8 ]; then ERRORS="at least 8 characters"; fi
if ! echo "$PASSWORD" | grep -qP '[A-Z]'; then ERRORS="$ERRORS, an uppercase letter"; fi
if ! echo "$PASSWORD" | grep -qP '[a-z]'; then ERRORS="$ERRORS, a lowercase letter"; fi
if ! echo "$PASSWORD" | grep -qP '[0-9]'; then ERRORS="$ERRORS, a number"; fi
if ! echo "$PASSWORD" | grep -qP '[^A-Za-z0-9]'; then ERRORS="$ERRORS, a special character"; fi
ERRORS=$(echo "$ERRORS" | sed 's/^, //')

if [ -n "$ERRORS" ]; then
  echo "ERROR: Password must contain $ERRORS."
  exit 1
fi

echo ""
echo "--- Creating admin user ---"
echo ""

# Step 3: Create user in Cognito
echo "1. Creating user in Cognito..."
CREATE_OUTPUT=$(aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true Name=name,Value="$NAME" \
  --message-action SUPPRESS \
  --region "$REGION" 2>&1) && {
  echo "   Done."
} || {
  if echo "$CREATE_OUTPUT" | grep -q "UsernameExistsException"; then
    echo "   User already exists, continuing..."
  else
    echo "   FAILED: $CREATE_OUTPUT"
    exit 1
  fi
}
echo ""

# Step 4: Set permanent password
echo "2. Setting permanent password..."
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --password "$PASSWORD" \
  --permanent \
  --region "$REGION"
echo "   Done."
echo ""

# Step 5: Add to Admins group
echo "3. Adding to Admins group..."
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --group-name Admins \
  --region "$REGION"
echo "   Done."
echo ""

# Step 6: Create user record in DynamoDB
echo "4. Creating user record in DynamoDB..."
USERS_TABLE=$(cd "$TERRAFORM_DIR" && terraform output -raw users_table_name 2>/dev/null) || true

if [ -n "$USERS_TABLE" ]; then
  # Get the user's sub (userId)
  USER_INFO=$(aws cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --region "$REGION")

  SUB=$(echo "$USER_INFO" | python3 -c "import sys,json; attrs=json.load(sys.stdin)['UserAttributes']; print(next((a['Value'] for a in attrs if a['Name']=='sub'),''))" 2>/dev/null) || true

  if [ -n "$SUB" ]; then
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    aws dynamodb put-item \
      --table-name "$USERS_TABLE" \
      --item "{
        \"userId\": {\"S\": \"$SUB\"},
        \"email\": {\"S\": \"$EMAIL\"},
        \"name\": {\"S\": \"$NAME\"},
        \"role\": {\"S\": \"ADMIN\"},
        \"isActive\": {\"BOOL\": true},
        \"createdAt\": {\"S\": \"$NOW\"},
        \"updatedAt\": {\"S\": \"$NOW\"}
      }" \
      --region "$REGION"
    echo "   Done."
  else
    echo "   Skipped (could not get user sub)."
  fi
else
  echo "   Skipped (could not get table name)."
fi

echo ""
echo "============================================"
echo "  Admin user created successfully!"
echo "============================================"
echo "  Email:    $EMAIL"
echo "  Name:     $NAME"
echo "  Role:     Administrator"
echo "  Password: (as entered)"
echo ""
echo "  You can now log in at http://localhost:3000"
echo "============================================"
echo ""
