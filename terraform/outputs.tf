# Terraform Outputs for Task Management System

# ============================================================================
# COGNITO OUTPUTS
# ============================================================================
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.user_pool_client_id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = module.cognito.cognito_domain
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.cognito.user_pool_arn
}

# ============================================================================
# DYNAMODB OUTPUTS
# ============================================================================
output "tasks_table_name" {
  description = "DynamoDB Tasks table name"
  value       = module.dynamodb.tasks_table_name
}

output "users_table_name" {
  description = "DynamoDB Users table name"
  value       = module.dynamodb.users_table_name
}

output "tasks_table_arn" {
  description = "DynamoDB Tasks table ARN"
  value       = module.dynamodb.tasks_table_arn
}

output "users_table_arn" {
  description = "DynamoDB Users table ARN"
  value       = module.dynamodb.users_table_arn
}

# ============================================================================
# API GATEWAY OUTPUTS
# ============================================================================
output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = module.api_gateway.api_endpoint
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = module.api_gateway.api_id
}

output "api_gateway_stage_name" {
  description = "API Gateway stage name"
  value       = module.api_gateway.stage_name
}

# ============================================================================
# LAMBDA OUTPUTS
# ============================================================================
output "lambda_function_names" {
  description = "Names of all Lambda functions"
  value = {
    create_task   = module.lambda.create_task_function_name
    get_tasks     = module.lambda.get_tasks_function_name
    get_task      = module.lambda.get_task_function_name
    update_task   = module.lambda.update_task_function_name
    delete_task   = module.lambda.delete_task_function_name
    assign_task   = module.lambda.assign_task_function_name
    update_status = module.lambda.update_status_function_name
    get_users     = module.lambda.get_users_function_name
  }
}

# ============================================================================
# AMPLIFY OUTPUTS
# ============================================================================
output "amplify_app_id" {
  description = "Amplify App ID"
  value       = module.amplify.app_id
}

output "amplify_default_domain" {
  description = "Amplify default domain"
  value       = module.amplify.default_domain
}

output "amplify_branch_url" {
  description = "Amplify branch URL"
  value       = module.amplify.branch_url
}

# ============================================================================
# FRONTEND CONFIGURATION
# ============================================================================
output "frontend_config" {
  description = "Configuration for frontend application"
  value = {
    api_url              = module.api_gateway.api_endpoint
    cognito_user_pool_id = module.cognito.user_pool_id
    cognito_client_id    = module.cognito.user_pool_client_id
    cognito_domain       = module.cognito.cognito_domain
    aws_region           = var.aws_region
  }
}
