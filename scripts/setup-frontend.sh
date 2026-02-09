#!/bin/bash

# ===========================================
# Generate Frontend .env File
# ===========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header "Generate Frontend Configuration"

# Get values from Terraform
cd "$PROJECT_ROOT/terraform/environments/dev"

print_message $YELLOW "Fetching configuration from Terraform..."

API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
COGNITO_DOMAIN=$(terraform output -raw cognito_domain 2>/dev/null || echo "")
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "eu-central-1")

if [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
    print_message $RED "Error: Could not get all required values from Terraform."
    print_message $RED "Make sure infrastructure is deployed with 'terraform apply'"
    exit 1
fi

print_message $GREEN "✓ Configuration fetched"

# Create .env file
cd "$PROJECT_ROOT/frontend"

cat > .env << EOF
# AWS Configuration
REACT_APP_API_URL=$API_URL
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_CLIENT_ID=$CLIENT_ID
REACT_APP_COGNITO_DOMAIN=$COGNITO_DOMAIN
REACT_APP_REGION=$AWS_REGION

# Optional: Enable debug mode
# REACT_APP_DEBUG=true
EOF

print_message $GREEN "✓ Created frontend/.env"

print_header "Frontend Configuration Complete!"

echo "API URL: $API_URL"
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: ${CLIENT_ID:0:20}..."
echo "Region: $AWS_REGION"
echo ""
print_message $YELLOW "Next steps:"
echo "1. cd frontend"
echo "2. npm install"
echo "3. npm start"
echo ""

cd "$SCRIPT_DIR"
