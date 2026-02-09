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

variable "tasks_table_name" {
  description = "DynamoDB tasks table name"
  type        = string
}

variable "tasks_table_arn" {
  description = "DynamoDB tasks table ARN"
  type        = string
}

variable "users_table_name" {
  description = "DynamoDB users table name"
  type        = string
}

variable "users_table_arn" {
  description = "DynamoDB users table ARN"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for notifications"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "task_assignments_table_arn" {
  description = "DynamoDB task assignments table ARN"
  type        = string
}

variable "cors_allowed_origin" {
  description = "Allowed CORS origin for Lambda responses"
  type        = string
  default     = "*"
}
