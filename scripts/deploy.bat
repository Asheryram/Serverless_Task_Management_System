@echo off
REM ===========================================
REM Serverless Task Management System
REM Infrastructure Deployment Script (Windows)
REM ===========================================

setlocal EnableDelayedExpansion

echo.
echo ============================================
echo  Checking Prerequisites
echo ============================================
echo.

REM Check AWS CLI
where aws >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] AWS CLI is not installed
    exit /b 1
)
echo [OK] AWS CLI is installed

REM Check Terraform
where terraform >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Terraform is not installed
    exit /b 1
)
echo [OK] Terraform is installed

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed
    exit /b 1
)
echo [OK] Node.js is installed

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed
    exit /b 1
)
echo [OK] npm is installed

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] AWS credentials not configured
    exit /b 1
)
echo [OK] AWS credentials are configured

REM Set defaults
set ENVIRONMENT=dev
set AWS_REGION=us-east-1
set PROJECT_NAME=task-management

REM Get script directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

echo.
echo ============================================
echo  Deployment Configuration
echo ============================================
echo.
echo Environment: %ENVIRONMENT%
echo AWS Region:  %AWS_REGION%
echo Project:     %PROJECT_NAME%

echo.
echo ============================================
echo  Deploying Infrastructure with Terraform
echo ============================================
echo.

cd /d "%PROJECT_ROOT%\terraform"

REM Initialize Terraform
echo Initializing Terraform...
terraform init
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Terraform init failed
    exit /b 1
)
echo [OK] Terraform initialized

REM Create terraform.tfvars if it doesn't exist
if not exist "terraform.tfvars" (
    echo Creating terraform.tfvars...
    (
        echo environment = "%ENVIRONMENT%"
        echo aws_region = "%AWS_REGION%"
        echo project_name = "%PROJECT_NAME%"
        echo allowed_email_domains = ["amalitech.com", "amalitechtraining.org"]
    ) > terraform.tfvars
    echo [OK] Created terraform.tfvars
)

REM Validate Terraform configuration
echo Validating Terraform configuration...
terraform validate
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Terraform validation failed
    exit /b 1
)
echo [OK] Terraform configuration is valid

REM Plan deployment
echo Planning deployment...
terraform plan -out=tfplan
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Terraform plan failed
    exit /b 1
)

echo.
set /p CONFIRM="Do you want to apply this plan? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Deployment cancelled
    exit /b 0
)

REM Apply deployment
echo Applying Terraform plan...
terraform apply tfplan
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Terraform apply failed
    exit /b 1
)

echo [OK] Infrastructure deployed successfully

echo.
echo ============================================
echo  Deployment Outputs
echo ============================================
echo.
terraform output

echo.
echo ============================================
echo  Building Frontend Application
echo ============================================
echo.

cd /d "%PROJECT_ROOT%\frontend"

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed
    exit /b 1
)
echo [OK] Dependencies installed

REM Build the application
echo Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [OK] Frontend built successfully

echo.
echo ============================================
echo  Deployment Complete!
echo ============================================
echo.
echo Your Serverless Task Management System has been deployed.
echo.
echo Next Steps:
echo 1. Configure SES email identities in the AWS Console
echo 2. Verify your domain for sending emails
echo 3. Create admin users in Cognito User Pool
echo 4. Test the application at the Amplify URL
echo.

cd /d "%SCRIPT_DIR%"
endlocal
