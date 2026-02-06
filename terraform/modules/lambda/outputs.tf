# Create Task Function
output "create_task_function_arn" {
  value = aws_lambda_function.create_task.arn
}

output "create_task_function_name" {
  value = aws_lambda_function.create_task.function_name
}

output "create_task_invoke_arn" {
  value = aws_lambda_function.create_task.invoke_arn
}

# Get Tasks Function
output "get_tasks_function_arn" {
  value = aws_lambda_function.get_tasks.arn
}

output "get_tasks_function_name" {
  value = aws_lambda_function.get_tasks.function_name
}

output "get_tasks_invoke_arn" {
  value = aws_lambda_function.get_tasks.invoke_arn
}

# Get Task Function
output "get_task_function_arn" {
  value = aws_lambda_function.get_task.arn
}

output "get_task_function_name" {
  value = aws_lambda_function.get_task.function_name
}

output "get_task_invoke_arn" {
  value = aws_lambda_function.get_task.invoke_arn
}

# Update Task Function
output "update_task_function_arn" {
  value = aws_lambda_function.update_task.arn
}

output "update_task_function_name" {
  value = aws_lambda_function.update_task.function_name
}

output "update_task_invoke_arn" {
  value = aws_lambda_function.update_task.invoke_arn
}

# Delete Task Function
output "delete_task_function_arn" {
  value = aws_lambda_function.delete_task.arn
}

output "delete_task_function_name" {
  value = aws_lambda_function.delete_task.function_name
}

output "delete_task_invoke_arn" {
  value = aws_lambda_function.delete_task.invoke_arn
}

# Assign Task Function
output "assign_task_function_arn" {
  value = aws_lambda_function.assign_task.arn
}

output "assign_task_function_name" {
  value = aws_lambda_function.assign_task.function_name
}

output "assign_task_invoke_arn" {
  value = aws_lambda_function.assign_task.invoke_arn
}

# Update Status Function
output "update_status_function_arn" {
  value = aws_lambda_function.update_status.arn
}

output "update_status_function_name" {
  value = aws_lambda_function.update_status.function_name
}

output "update_status_invoke_arn" {
  value = aws_lambda_function.update_status.invoke_arn
}

# Get Users Function
output "get_users_function_arn" {
  value = aws_lambda_function.get_users.arn
}

output "get_users_function_name" {
  value = aws_lambda_function.get_users.function_name
}

output "get_users_invoke_arn" {
  value = aws_lambda_function.get_users.invoke_arn
}

# Post Confirmation Function
output "post_confirmation_function_arn" {
  value = aws_lambda_function.post_confirmation.arn
}

output "post_confirmation_function_name" {
  value = aws_lambda_function.post_confirmation.function_name
}

# Lambda Execution Role
output "lambda_execution_role_arn" {
  value = aws_iam_role.lambda_execution_role.arn
}
