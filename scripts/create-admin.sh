#!/bin/bash

# ===========================================
# Serverless Task Management System
# Create Admin User Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message $BLUE "============================================"
    print_message $BLUE "$1"
    print_message $BLUE "============================================"
    echo ""
}

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header "Create Admin User"

# Get Cognito User Pool ID from Terraform
cd "$PROJECT_ROOT/terraform"
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")

if [ -z "$USER_POOL_ID" ]; then
    print_message $RED "Error: Could not get User Pool ID. Make sure infrastructure is deployed."
    exit 1
fi

print_message $GREEN "User Pool ID: $USER_POOL_ID"
echo ""

# Get user details
read -p "Enter email address: " EMAIL
read -p "Enter full name: " NAME
read -sp "Enter temporary password (min 8 chars): " PASSWORD
echo ""

# Validate email domain
DOMAIN=$(echo "$EMAIL" | cut -d'@' -f2)
if [[ "$DOMAIN" != "amalitech.com" && "$DOMAIN" != "amalitechtraining.org" ]]; then
    print_message $RED "Error: Email must be from @amalitech.com or @amalitechtraining.org"
    exit 1
fi

print_message $YELLOW "Creating user..."

# Create user in Cognito
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --user-attributes \
        Name=email,Value="$EMAIL" \
        Name=email_verified,Value=true \
        Name=name,Value="$NAME" \
    --temporary-password "$PASSWORD" \
    --message-action SUPPRESS

print_message $GREEN "✓ User created"

# Add user to Admins group
print_message $YELLOW "Adding user to Admins group..."

aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --group-name "Admins"

print_message $GREEN "✓ User added to Admins group"

print_header "Admin User Created!"
echo "Email: $EMAIL"
echo "Name: $NAME"
echo "Role: Administrator"
echo ""
print_message $YELLOW "Note: User will need to change password on first login."
echo ""

cd "$SCRIPT_DIR"
