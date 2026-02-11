@echo off
echo ========================================
echo Amplify Deployment Trigger Script
echo ========================================
echo.

cd terraform\environments\dev

echo Getting Amplify App ID...
for /f "tokens=*" %%i in ('terraform output -raw amplify_url') do set AMPLIFY_URL=%%i
echo Amplify URL: %AMPLIFY_URL%

echo.
echo Listing Amplify apps in current AWS account...
aws amplify list-apps --region eu-central-1 --query "apps[].{Name:name,AppId:appId,URL:defaultDomain}" --output table

echo.
echo ========================================
echo MANUAL STEPS REQUIRED:
echo ========================================
echo 1. Go to AWS Amplify Console:
echo    https://eu-central-1.console.aws.amazon.com/amplify/
echo.
echo 2. Find your app: tms-dev-frontend-*
echo.
echo 3. Click "Run build" to trigger deployment
echo.
echo 4. Or run: terraform apply -replace="module.task_management.module.amplify.aws_amplify_branch.main"
echo ========================================

pause
