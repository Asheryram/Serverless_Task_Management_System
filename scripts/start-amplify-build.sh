#!/bin/bash

cd "$(dirname "$0")/../terraform/environments/dev"

APP_ID=$(terraform output -raw amplify_url | grep -oP 'd[a-z0-9]+(?=\.amplifyapp)')
REGION="eu-central-1"

echo "Starting Amplify build for app: $APP_ID"

aws amplify start-job \
  --app-id "$APP_ID" \
  --branch-name main \
  --job-type RELEASE \
  --region "$REGION"
