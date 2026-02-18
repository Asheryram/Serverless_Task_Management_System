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

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN for authorizer"
  type        = string
}

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS. Must be explicitly set to a strict list of origins (e.g. [\"https://your-frontend.com\"]). Do not use [\"*\"] in production."
  type        = list(string)
}

# Lambda ARNs
variable "create_task_lambda_arn" {
  type = string
}

variable "get_tasks_lambda_arn" {
  type = string
}

variable "get_task_lambda_arn" {
  type = string
}

variable "update_task_lambda_arn" {
  type = string
}

variable "delete_task_lambda_arn" {
  type = string
}

variable "assign_task_lambda_arn" {
  type = string
}

variable "update_status_lambda_arn" {
  type = string
}

variable "get_users_lambda_arn" {
  type = string
}

# Lambda Names
variable "create_task_lambda_name" {
  type = string
}

variable "get_tasks_lambda_name" {
  type = string
}

variable "get_task_lambda_name" {
  type = string
}

variable "update_task_lambda_name" {
  type = string
}

variable "delete_task_lambda_name" {
  type = string
}

variable "assign_task_lambda_name" {
  type = string
}

variable "update_status_lambda_name" {
  type = string
}

variable "get_users_lambda_name" {
  type = string
}
