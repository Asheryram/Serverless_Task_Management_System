output "tasks_table_name" {
  description = "Tasks table name"
  value       = aws_dynamodb_table.tasks.name
}

output "tasks_table_arn" {
  description = "Tasks table ARN"
  value       = aws_dynamodb_table.tasks.arn
}

output "users_table_name" {
  description = "Users table name"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "Users table ARN"
  value       = aws_dynamodb_table.users.arn
}

output "task_assignments_table_name" {
  description = "Task assignments table name"
  value       = aws_dynamodb_table.task_assignments.name
}

output "task_assignments_table_arn" {
  description = "Task assignments table ARN"
  value       = aws_dynamodb_table.task_assignments.arn
}
