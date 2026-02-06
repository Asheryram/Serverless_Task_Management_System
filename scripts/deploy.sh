#!/bin/bash

# ===========================================
# Serverless Task Management System
# Infrastructure Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
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

# Check if required tools are installed
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_message $RED "Error: AWS CLI is not installed"
        exit 1
    fi
    print_message $GREEN "✓ AWS CLI is installed"

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_message $RED "Error: Terraform is not installed"
        exit 1
    fi
    print_message $GREEN "✓ Terraform is installed"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_message $RED "Error: Node.js is not installed"
        exit 1
    fi
    print_message $GREEN "✓ Node.js is installed"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_message $RED "Error: npm is not installed"
        exit 1
    fi
    print_message $GREEN "✓ npm is installed"

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_message $RED "Error: AWS credentials not configured"
        exit 1
    fi
    print_message $GREEN "✓ AWS credentials are configured"
}

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-task-management}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --env       Environment (dev, staging, prod) [default: dev]"
            echo "  --region    AWS Region [default: us-east-1]"
            echo "  --project   Project name [default: task-management]"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            print_message $RED "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_header "Deployment Configuration"
echo "Environment: $ENVIRONMENT"
echo "AWS Region:  $AWS_REGION"
echo "Project:     $PROJECT_NAME"

# Run prerequisites check
check_prerequisites

# Package Lambda functions
package_lambdas() {
    print_header "Packaging Lambda Functions"
    
    LAMBDA_SRC="$PROJECT_ROOT/terraform/modules/lambda/src"
    LAMBDA_DIST="$PROJECT_ROOT/terraform/modules/lambda/dist"
    
    # Create dist directory
    mkdir -p "$LAMBDA_DIST"
    
    # Package each Lambda function
    for func_dir in "$LAMBDA_SRC"/*/; do
        if [ -d "$func_dir" ]; then
            func_name=$(basename "$func_dir")
            print_message $YELLOW "Packaging $func_name..."
            
            # Install dependencies if package.json exists
            if [ -f "$func_dir/package.json" ]; then
                cd "$func_dir"
                npm install --production
                cd "$SCRIPT_DIR"
            fi
            
            # Create zip file
            cd "$func_dir"
            zip -r "$LAMBDA_DIST/$func_name.zip" . > /dev/null
            cd "$SCRIPT_DIR"
            
            print_message $GREEN "✓ Packaged $func_name"
        fi
    done
    
    # Also package shared utils
    if [ -d "$PROJECT_ROOT/backend/src" ]; then
        print_message $YELLOW "Packaging backend services..."
        cd "$PROJECT_ROOT/backend/src"
        zip -r "$LAMBDA_DIST/backend-services.zip" . > /dev/null
        cd "$SCRIPT_DIR"
        print_message $GREEN "✓ Packaged backend services"
    fi
}

# Initialize and apply Terraform
deploy_infrastructure() {
    print_header "Deploying Infrastructure with Terraform"
    
    cd "$PROJECT_ROOT/terraform"
    
    # Initialize Terraform
    print_message $YELLOW "Initializing Terraform..."
    terraform init
    
    # Create terraform.tfvars if it doesn't exist
    if [ ! -f "terraform.tfvars" ]; then
        print_message $YELLOW "Creating terraform.tfvars..."
        cat > terraform.tfvars << EOF
environment = "$ENVIRONMENT"
aws_region = "$AWS_REGION"
project_name = "$PROJECT_NAME"
allowed_email_domains = ["amalitech.com", "amalitechtraining.org"]
EOF
        print_message $GREEN "✓ Created terraform.tfvars"
    fi
    
    # Validate Terraform configuration
    print_message $YELLOW "Validating Terraform configuration..."
    terraform validate
    print_message $GREEN "✓ Terraform configuration is valid"
    
    # Plan deployment
    print_message $YELLOW "Planning deployment..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    echo ""
    read -p "Do you want to apply this plan? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_message $YELLOW "Deployment cancelled"
        exit 0
    fi
    
    # Apply deployment
    print_message $YELLOW "Applying Terraform plan..."
    terraform apply tfplan
    
    print_message $GREEN "✓ Infrastructure deployed successfully"
    
    # Output important values
    print_header "Deployment Outputs"
    terraform output
    
    cd "$SCRIPT_DIR"
}

# Build frontend
build_frontend() {
    print_header "Building Frontend Application"
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies
    print_message $YELLOW "Installing dependencies..."
    npm install
    
    # Get Terraform outputs
    cd "$PROJECT_ROOT/terraform"
    API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
    USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
    USER_POOL_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id 2>/dev/null || echo "")
    
    cd "$PROJECT_ROOT/frontend"
    
    # Create .env file
    if [ -n "$API_URL" ]; then
        print_message $YELLOW "Creating .env file..."
        cat > .env << EOF
REACT_APP_API_URL=$API_URL
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_AWS_REGION=$AWS_REGION
EOF
        print_message $GREEN "✓ Created .env file"
    fi
    
    # Build the application
    print_message $YELLOW "Building application..."
    npm run build
    
    print_message $GREEN "✓ Frontend built successfully"
    
    cd "$SCRIPT_DIR"
}

# Main deployment flow
main() {
    print_header "Starting Deployment"
    
    # Package Lambda functions
    package_lambdas
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Build frontend
    build_frontend
    
    print_header "Deployment Complete!"
    print_message $GREEN "Your Serverless Task Management System has been deployed."
    echo ""
    print_message $YELLOW "Next Steps:"
    echo "1. Configure SES email identities in the AWS Console"
    echo "2. Verify your domain for sending emails"
    echo "3. Create admin users in Cognito User Pool"
    echo "4. Test the application at the Amplify URL"
    echo ""
}

# Run main function
main
