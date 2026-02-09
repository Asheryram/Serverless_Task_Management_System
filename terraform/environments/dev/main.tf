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
  aws_region  = "eu-central-1"
  environment = "dev"

  # Cognito
  allowed_email_domains = ["amalitech.com", "amalitechtraining.org"]
  cognito_callback_urls = [
    "http://localhost:3000/callback",
    "http://localhost:3000"
  ]
  cognito_logout_urls = [
    "http://localhost:3000/logout",
    "http://localhost:3000"
  ]

  # SES - Still used by Cognito for verification emails
  ses_from_email = "yram.tetteh-abotsi@amalitech.com"
  admin_email    = "yram.tetteh-abotsi@amalitech.com"

  # SNS - Email addresses to receive task notifications
  notification_emails = [
    "yram.tetteh-abotsi@amalitech.com"
  ]

  # CORS
  cors_allowed_origins = [
    "http://localhost:3000",
    "https://localhost:3000"
  ]

  # Amplify - Update with your repository details
  frontend_repository_url = ""  # e.g., "https://github.com/username/repo"
  github_access_token     = ""  # Your GitHub PAT
  frontend_branch_name    = "main"
}

# Outputs
output "api_url" {
  value = module.task_management.api_gateway_url
}

output "cognito_user_pool_id" {
  value = module.task_management.cognito_user_pool_id
}

output "cognito_client_id" {
  value = module.task_management.cognito_user_pool_client_id
}

output "cognito_domain" {
  value = module.task_management.cognito_domain
}

output "amplify_url" {
  value = module.task_management.amplify_branch_url
}

output "frontend_config" {
  value = module.task_management.frontend_config
}
