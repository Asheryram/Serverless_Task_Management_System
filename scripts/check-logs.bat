@echo off
REM Check CloudWatch logs for update-status Lambda function

echo Fetching recent logs from update-status Lambda...
echo.

aws logs tail /aws/lambda/tms-dev-update-status-ff1db3da --since 10m --format short --filter-pattern "Email"

echo.
echo ============================================
echo.
echo To follow logs in real-time, run:
echo aws logs tail /aws/lambda/tms-dev-update-status-ff1db3da --follow
echo.
echo To see all recent logs:
echo aws logs tail /aws/lambda/tms-dev-update-status-ff1db3da --since 30m
