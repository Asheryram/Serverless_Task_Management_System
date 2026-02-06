variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "name_suffix" {
  description = "Suffix for resource names"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repository_url" {
  description = "GitHub repository URL (optional - leave empty for manual deployment)"
  type        = string
  default     = ""
}

variable "github_access_token" {
  description = "GitHub personal access token (optional - only needed if repository_url is provided)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "branch_name" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}

variable "api_gateway_url" {
  description = "API Gateway URL"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito Client ID"
  type        = string
}

variable "cognito_domain" {
  description = "Cognito Domain"
  type        = string
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
}

variable "custom_domain" {
  description = "Custom domain for the app"
  type        = string
  default     = ""
}
