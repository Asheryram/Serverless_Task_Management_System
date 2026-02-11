# Development Environment Configuration

terraform {
  # Uncomment to use S3 backend for state management
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "task-management/dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

module "task_management" {
  source = "../../"

  # General
  aws_region  = var.aws_region
  environment = var.environment

  # Cognito
  allowed_email_domains = var.allowed_email_domains
  cognito_callback_urls = var.cognito_callback_urls
  cognito_logout_urls   = var.cognito_logout_urls

  # SES
  ses_from_email = var.ses_from_email
  admin_email    = var.admin_email

  # SNS
  notification_emails = var.notification_emails

  # CORS
  cors_allowed_origins = var.cors_allowed_origins

  # Amplify
  frontend_repository_url = var.frontend_repository_url
  github_access_token     = var.github_access_token
  frontend_branch_name    = var.frontend_branch_name
}
