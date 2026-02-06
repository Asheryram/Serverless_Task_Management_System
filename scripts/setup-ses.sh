#!/bin/bash

# ===========================================
# Serverless Task Management System
# Setup SES Email Script
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

AWS_REGION="${AWS_REGION:-us-east-1}"

print_header "SES Email Setup"

# Check if in sandbox mode
echo "Checking SES account status..."
ACCOUNT_STATUS=$(aws ses get-account-sending-enabled --region "$AWS_REGION" 2>/dev/null || echo "false")
print_message $YELLOW "Note: If your SES account is in sandbox mode, you can only send to verified email addresses."

echo ""
read -p "Enter the email address to verify for sending: " SENDER_EMAIL

# Verify sender email
print_message $YELLOW "Verifying email address..."
aws ses verify-email-identity \
    --email-address "$SENDER_EMAIL" \
    --region "$AWS_REGION"

print_message $GREEN "✓ Verification email sent to $SENDER_EMAIL"
print_message $YELLOW "Please check your inbox and click the verification link."

echo ""
read -p "Press Enter after you have verified your email..."

# Check verification status
VERIFICATION_STATUS=$(aws ses get-identity-verification-attributes \
    --identities "$SENDER_EMAIL" \
    --region "$AWS_REGION" \
    --query "VerificationAttributes.$SENDER_EMAIL.VerificationStatus" \
    --output text 2>/dev/null || echo "NotVerified")

if [ "$VERIFICATION_STATUS" == "Success" ]; then
    print_message $GREEN "✓ Email $SENDER_EMAIL is verified!"
else
    print_message $YELLOW "Email verification status: $VERIFICATION_STATUS"
    print_message $YELLOW "Please verify your email before sending notifications."
fi

# Create email templates
print_header "Creating Email Templates"

# Task Assignment Template
print_message $YELLOW "Creating task assignment email template..."
aws ses create-template \
    --cli-input-json '{
        "Template": {
            "TemplateName": "TaskAssignmentTemplate",
            "SubjectPart": "New Task Assigned: {{taskTitle}}",
            "HtmlPart": "<html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px}.task-info{background:white;padding:15px;border-radius:8px;margin:15px 0}.btn{display:inline-block;background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px}</style></head><body><div class=\"container\"><div class=\"header\"><h1>New Task Assigned</h1></div><div class=\"content\"><p>Hello {{memberName}},</p><p>A new task has been assigned to you:</p><div class=\"task-info\"><h3>{{taskTitle}}</h3><p>{{taskDescription}}</p><p><strong>Priority:</strong> {{priority}}</p><p><strong>Due Date:</strong> {{dueDate}}</p></div><a href=\"{{taskUrl}}\" class=\"btn\">View Task</a><p style=\"margin-top:20px;color:#6b7280;font-size:14px\">This is an automated message from Task Management System.</p></div></div></body></html>",
            "TextPart": "Hello {{memberName}},\n\nA new task has been assigned to you:\n\nTitle: {{taskTitle}}\nDescription: {{taskDescription}}\nPriority: {{priority}}\nDue Date: {{dueDate}}\n\nView task at: {{taskUrl}}\n\nThis is an automated message from Task Management System."
        }
    }' \
    --region "$AWS_REGION" 2>/dev/null || print_message $YELLOW "Template already exists or error creating"

print_message $GREEN "✓ Task assignment template created"

# Task Status Update Template
print_message $YELLOW "Creating task status update email template..."
aws ses create-template \
    --cli-input-json '{
        "Template": {
            "TemplateName": "TaskStatusUpdateTemplate",
            "SubjectPart": "Task Status Updated: {{taskTitle}}",
            "HtmlPart": "<html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px}.status-change{background:white;padding:15px;border-radius:8px;margin:15px 0;display:flex;align-items:center;gap:10px}.old-status{padding:6px 12px;background:#fee2e2;color:#dc2626;border-radius:20px}.new-status{padding:6px 12px;background:#d1fae5;color:#047857;border-radius:20px}.arrow{font-size:20px}.btn{display:inline-block;background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px}</style></head><body><div class=\"container\"><div class=\"header\"><h1>Task Status Updated</h1></div><div class=\"content\"><p>Hello,</p><p>The status of the following task has been updated:</p><h3>{{taskTitle}}</h3><div class=\"status-change\"><span class=\"old-status\">{{oldStatus}}</span><span class=\"arrow\">→</span><span class=\"new-status\">{{newStatus}}</span></div><p><strong>Updated by:</strong> {{updatedBy}}</p><a href=\"{{taskUrl}}\" class=\"btn\">View Task</a><p style=\"margin-top:20px;color:#6b7280;font-size:14px\">This is an automated message from Task Management System.</p></div></div></body></html>",
            "TextPart": "Hello,\n\nThe status of the following task has been updated:\n\nTask: {{taskTitle}}\nOld Status: {{oldStatus}}\nNew Status: {{newStatus}}\nUpdated by: {{updatedBy}}\n\nView task at: {{taskUrl}}\n\nThis is an automated message from Task Management System."
        }
    }' \
    --region "$AWS_REGION" 2>/dev/null || print_message $YELLOW "Template already exists or error creating"

print_message $GREEN "✓ Task status update template created"

print_header "SES Setup Complete!"
echo "Verified Sender: $SENDER_EMAIL"
echo ""
print_message $YELLOW "Important Notes:"
echo "1. If your account is in SES sandbox, you can only send to verified emails"
echo "2. To send to any email, request production access in AWS Console"
echo "3. Update the SES_SENDER_EMAIL in your Lambda environment variables"
echo ""
