# Serverless Task Management System - Main Terraform Configuration
# This file orchestrates all AWS resources for the task management system

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TaskManagementSystem"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  name_prefix = "tms-${var.environment}"
  name_suffix = random_id.suffix.hex
}

# ============================================================================
# COGNITO - Authentication
# ============================================================================
module "cognito" {
  source = "./modules/cognito"

  name_prefix         = local.name_prefix
  name_suffix         = local.name_suffix
  allowed_domains     = var.allowed_email_domains
  ses_from_email      = var.ses_from_email
  callback_urls       = var.cognito_callback_urls
  logout_urls         = var.cognito_logout_urls
}

# ============================================================================
# DYNAMODB - Database
# ============================================================================
module "dynamodb" {
  source = "./modules/dynamodb"

  name_prefix = local.name_prefix
  name_suffix = local.name_suffix
  environment = var.environment
}

# ============================================================================
# SES - Email Notifications
# ============================================================================
module "ses" {
  source = "./modules/ses"

  name_prefix    = local.name_prefix
  domain         = var.ses_domain
  from_email     = var.ses_from_email
  admin_email    = var.admin_email
}

# ============================================================================
# LAMBDA - Business Logic
# ============================================================================
module "lambda" {
  source = "./modules/lambda"

  name_prefix          = local.name_prefix
  name_suffix          = local.name_suffix
  environment          = var.environment
  aws_region           = var.aws_region
  tasks_table_name     = module.dynamodb.tasks_table_name
  tasks_table_arn      = module.dynamodb.tasks_table_arn
  users_table_name     = module.dynamodb.users_table_name
  users_table_arn      = module.dynamodb.users_table_arn
  ses_from_email       = var.ses_from_email
  cognito_user_pool_id = module.cognito.user_pool_id
}

# ============================================================================
# API GATEWAY - REST API
# ============================================================================
module "api_gateway" {
  source = "./modules/api-gateway"

  name_prefix               = local.name_prefix
  name_suffix               = local.name_suffix
  environment               = var.environment
  aws_region                = var.aws_region
  cognito_user_pool_arn     = module.cognito.user_pool_arn
  
  # Lambda function ARNs
  create_task_lambda_arn    = module.lambda.create_task_function_arn
  get_tasks_lambda_arn      = module.lambda.get_tasks_function_arn
  get_task_lambda_arn       = module.lambda.get_task_function_arn
  update_task_lambda_arn    = module.lambda.update_task_function_arn
  delete_task_lambda_arn    = module.lambda.delete_task_function_arn
  assign_task_lambda_arn    = module.lambda.assign_task_function_arn
  update_status_lambda_arn  = module.lambda.update_status_function_arn
  get_users_lambda_arn      = module.lambda.get_users_function_arn
  
  # Lambda function names for permissions
  create_task_lambda_name   = module.lambda.create_task_function_name
  get_tasks_lambda_name     = module.lambda.get_tasks_function_name
  get_task_lambda_name      = module.lambda.get_task_function_name
  update_task_lambda_name   = module.lambda.update_task_function_name
  delete_task_lambda_name   = module.lambda.delete_task_function_name
  assign_task_lambda_name   = module.lambda.assign_task_function_name
  update_status_lambda_name = module.lambda.update_status_function_name
  get_users_lambda_name     = module.lambda.get_users_function_name

  cors_allowed_origins      = var.cors_allowed_origins
}

# ============================================================================
# AMPLIFY - Frontend Hosting
# ============================================================================
module "amplify" {
  source = "./modules/amplify"

  name_prefix              = local.name_prefix
  name_suffix              = local.name_suffix
  environment              = var.environment
  repository_url           = var.frontend_repository_url
  github_access_token      = var.github_access_token
  branch_name              = var.frontend_branch_name
  api_gateway_url          = module.api_gateway.api_endpoint
  cognito_user_pool_id     = module.cognito.user_pool_id
  cognito_client_id        = module.cognito.user_pool_client_id
  cognito_domain           = module.cognito.cognito_domain
  aws_region               = var.aws_region
}
