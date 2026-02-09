# Terraform Variables for Task Management System

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# ============================================================================
# COGNITO VARIABLES
# ============================================================================
variable "allowed_email_domains" {
  description = "List of allowed email domains for signup"
  type        = list(string)
  default     = ["amalitech.com", "amalitechtraining.org"]
}

variable "cognito_callback_urls" {
  description = "Allowed callback URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "cognito_logout_urls" {
  description = "Allowed logout URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:3000/logout"]
}

# ============================================================================
# SES VARIABLES
# ============================================================================
variable "ses_domain" {
  description = "Domain for SES email sending"
  type        = string
  default     = ""
}

variable "ses_from_email" {
  description = "From email address for notifications"
  type        = string
  default     = "noreply@amalitech.com"
}

variable "admin_email" {
  description = "Admin email for notifications"
  type        = string
  default     = ""
}

# ============================================================================
# SNS VARIABLES
# ============================================================================
variable "notification_emails" {
  description = "List of email addresses to subscribe to SNS notifications"
  type        = list(string)
  default     = []
}

# ============================================================================
# API GATEWAY VARIABLES
# ============================================================================
variable "cors_allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

# ============================================================================
# AMPLIFY VARIABLES
# ============================================================================
variable "frontend_repository_url" {
  description = "GitHub repository URL for frontend"
  type        = string
  default     = ""
}

variable "github_access_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  sensitive   = true
  default     = ""
}

variable "frontend_branch_name" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}
