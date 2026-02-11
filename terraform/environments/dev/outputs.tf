
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