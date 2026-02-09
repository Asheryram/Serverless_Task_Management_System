#!/bin/bash

# ===========================================
# Get Authentication Token
# ===========================================

set -e

# Colors
RED='\033[0;31m'
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

print_header "Get Authentication Token"

# Get Cognito Client ID and Region from Terraform
cd "$PROJECT_ROOT/terraform/environments/dev"
CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "eu-central-1")

if [ -z "$CLIENT_ID" ]; then
    print_message $RED "Error: Could not get Cognito Client ID. Make sure infrastructure is deployed."
    exit 1
fi

print_message $GREEN "Client ID: ${CLIENT_ID:0:20}..."
print_message $GREEN "AWS Region: $AWS_REGION"
echo ""

# Get user credentials
read -p "Enter email address: " EMAIL
read -sp "Enter password: " PASSWORD
echo ""
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_message $RED "Error: Node.js is not installed"
    exit 1
fi

# Check if AWS SDK is installed
cd "$PROJECT_ROOT"
if [ ! -d "node_modules/@aws-sdk/client-cognito-identity-provider" ]; then
    print_message $YELLOW "Installing AWS SDK..."
    npm install @aws-sdk/client-cognito-identity-provider
fi

# Create temporary token script
cat > /tmp/get-token-temp.js << 'EOF'
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

async function getToken() {
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.CLIENT_ID,
      AuthParameters: {
        USERNAME: process.env.USERNAME,
        PASSWORD: process.env.PASSWORD
      }
    });
    
    const response = await client.send(command);
    console.log(response.AuthenticationResult.IdToken);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getToken();
EOF

# Get token
print_message $YELLOW "Getting authentication token..."
TOKEN=$(AWS_REGION="$AWS_REGION" CLIENT_ID="$CLIENT_ID" USERNAME="$EMAIL" PASSWORD="$PASSWORD" node /tmp/get-token-temp.js 2>&1)

# Clean up
rm /tmp/get-token-temp.js

if [[ $TOKEN == *"Error"* ]]; then
    print_message $RED "Failed to get token:"
    echo "$TOKEN"
    exit 1
fi

print_header "Token Retrieved!"
echo "Token: ${TOKEN:0:50}..."
echo ""
print_message $YELLOW "To use this token, run:"
echo "export TOKEN=\"$TOKEN\""
echo ""
print_message $YELLOW "Or copy the full token:"
echo "$TOKEN"
echo ""

cd "$SCRIPT_DIR"
