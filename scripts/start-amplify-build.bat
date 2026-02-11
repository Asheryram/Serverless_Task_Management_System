@echo off
cd /d "%~dp0..\terraform\environments\dev"

for /f "tokens=*" %%i in ('terraform output -raw amplify_url') do set URL=%%i
for /f "tokens=2 delims=." %%a in ("%URL%") do set APP_ID=%%a

echo Starting Amplify build for app: %APP_ID%

aws amplify start-job --app-id %APP_ID% --branch-name main --job-type RELEASE --region eu-central-1
