variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "allowed_email_domains" {
  description = "Allowed email domains for Cognito signup"
  type        = list(string)
}

variable "cognito_callback_urls" {
  description = "Cognito OAuth callback URLs"
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Cognito OAuth logout URLs"
  type        = list(string)
}

variable "ses_from_email" {
  description = "SES sender email address"
  type        = string
}

variable "admin_email" {
  description = "Admin email address"
  type        = string
}

variable "notification_emails" {
  description = "Email addresses for SNS notifications"
  type        = list(string)
}

variable "cors_allowed_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
}

variable "frontend_repository_url" {
  description = "GitHub repository URL for Amplify"
  type        = string
}

variable "github_access_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "frontend_branch_name" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}