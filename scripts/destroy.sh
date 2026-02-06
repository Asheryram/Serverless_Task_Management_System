#!/bin/bash

# ===========================================
# Serverless Task Management System
# Cleanup/Destroy Script
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

print_header "Infrastructure Cleanup"

print_message $RED "WARNING: This will destroy all infrastructure resources!"
echo ""
echo "The following resources will be deleted:"
echo "  - Cognito User Pool and all users"
echo "  - DynamoDB tables and all data"
echo "  - Lambda functions"
echo "  - API Gateway"
echo "  - SES configurations"
echo "  - Amplify application"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_message $YELLOW "Cleanup cancelled"
    exit 0
fi

print_message $YELLOW "Starting infrastructure cleanup..."

cd "$PROJECT_ROOT/terraform"

# Check if Terraform state exists
if [ ! -f "terraform.tfstate" ] && [ ! -d ".terraform" ]; then
    print_message $YELLOW "No Terraform state found. Nothing to destroy."
    exit 0
fi

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    print_message $YELLOW "Initializing Terraform..."
    terraform init
fi

# Plan destroy
print_message $YELLOW "Planning destruction..."
terraform plan -destroy -out=destroy-plan

# Final confirmation
echo ""
read -p "Final confirmation - Type 'DESTROY' to confirm: " final_confirm

if [ "$final_confirm" != "DESTROY" ]; then
    print_message $YELLOW "Cleanup cancelled"
    exit 0
fi

# Apply destroy
print_message $YELLOW "Destroying infrastructure..."
terraform apply destroy-plan

# Clean up local files
print_message $YELLOW "Cleaning up local files..."
rm -f tfplan destroy-plan
rm -rf "$PROJECT_ROOT/terraform/modules/lambda/dist"

print_header "Cleanup Complete"
print_message $GREEN "All infrastructure has been destroyed."

cd "$SCRIPT_DIR"
