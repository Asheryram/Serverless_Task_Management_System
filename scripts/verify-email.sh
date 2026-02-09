#!/bin/bash

# Verify SES Email Script
# Usage: bash scripts/verify-email.sh
#
# Sends a verification email to the specified address so SES can send to/from it.
# Required in SES sandbox mode for both sender and recipient emails.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform/environments/dev"

echo ""
echo "============================================"
echo "  Verify SES Email Address"
echo "============================================"
echo ""

# Get region from Terraform or prompt
REGION=$(cd "$TERRAFORM_DIR" && terraform output -raw aws_region 2>/dev/null) || true

if [ -z "$REGION" ]; then
  read -rp "Enter AWS region (default: eu-central-1): " REGION
  REGION=${REGION:-eu-central-1}
fi

echo "Region: $REGION"
echo ""

# Menu
echo "Options:"
echo "  1) Verify a new email address"
echo "  2) Check verification status of an email"
echo "  3) List all verified emails"
echo ""
read -rp "Choose an option (1/2/3): " OPTION

case $OPTION in
  1)
    read -rp "Email address to verify: " EMAIL
    if [ -z "$EMAIL" ]; then
      echo "ERROR: Email is required."
      exit 1
    fi

    echo ""
    echo "Sending verification email to $EMAIL..."
    aws ses verify-email-identity \
      --email-address "$EMAIL" \
      --region "$REGION"
    echo ""
    echo "Done! Check the inbox for $EMAIL and click the verification link."
    echo "Note: The link expires in 24 hours."
    ;;

  2)
    read -rp "Email address to check: " EMAIL
    if [ -z "$EMAIL" ]; then
      echo "ERROR: Email is required."
      exit 1
    fi

    echo ""
    echo "Checking verification status..."
    STATUS=$(aws ses get-identity-verification-attributes \
      --identities "$EMAIL" \
      --region "$REGION" \
      --output json)

    RESULT=$(echo "$STATUS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
attrs = data.get('VerificationAttributes', {})
email = list(attrs.keys())[0] if attrs else None
if email:
    print(attrs[email].get('VerificationStatus', 'Unknown'))
else:
    print('NotFound')
" 2>/dev/null) || RESULT="Error"

    echo ""
    case $RESULT in
      Success)
        echo "  $EMAIL: VERIFIED"
        ;;
      Pending)
        echo "  $EMAIL: PENDING - Check inbox for verification link"
        ;;
      NotFound)
        echo "  $EMAIL: NOT VERIFIED - Run option 1 to send verification email"
        ;;
      *)
        echo "  $EMAIL: $RESULT"
        ;;
    esac
    ;;

  3)
    echo ""
    echo "Verified email addresses:"
    echo ""
    IDENTITIES=$(aws ses list-identities \
      --identity-type EmailAddress \
      --region "$REGION" \
      --output json)

    EMAILS=$(echo "$IDENTITIES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for email in data.get('Identities', []):
    print(email)
" 2>/dev/null)

    if [ -z "$EMAILS" ]; then
      echo "  (none)"
    else
      # Get statuses for all emails
      STATUS=$(aws ses get-identity-verification-attributes \
        --identities $EMAILS \
        --region "$REGION" \
        --output json)

      echo "$STATUS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
attrs = data.get('VerificationAttributes', {})
for email, info in sorted(attrs.items()):
    status = info.get('VerificationStatus', 'Unknown')
    mark = 'Y' if status == 'Success' else 'N'
    print(f'  [{mark}] {email} ({status})')
" 2>/dev/null
    fi
    ;;

  *)
    echo "Invalid option."
    exit 1
    ;;
esac

echo ""
