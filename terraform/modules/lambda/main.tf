# Lambda Module - Serverless Functions
# All Lambda functions for task management operations

locals {
  lambda_runtime = "nodejs18.x"
  lambda_timeout = 30
  lambda_memory  = 256

  common_env_vars = {
    NODE_ENV             = var.environment
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    TASKS_TABLE_NAME     = var.tasks_table_name
    USERS_TABLE_NAME     = var.users_table_name
    TASK_ASSIGNMENTS_TABLE_NAME = var.task_assignments_table_name
    SNS_TOPIC_ARN        = var.sns_topic_arn
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    AWS_REGION_NAME      = var.aws_region
    CORS_ALLOWED_ORIGIN  = var.cors_allowed_origin
  }
}

# ============================================================================
# IAM ROLE FOR LAMBDA FUNCTIONS
# ============================================================================
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.name_prefix}-lambda-role-${var.name_suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.name_prefix}-lambda-role"
  }
}

# CloudWatch Logs policy
resource "aws_iam_role_policy" "lambda_logs" {
  name = "${var.name_prefix}-lambda-logs-${var.name_suffix}"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# DynamoDB policy - includes tasks, users, and assignments tables
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.name_prefix}-lambda-dynamodb-${var.name_suffix}"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.tasks_table_arn,
          "${var.tasks_table_arn}/index/*",
          var.users_table_arn,
          "${var.users_table_arn}/index/*",
          var.task_assignments_table_arn,
          "${var.task_assignments_table_arn}/index/*"
        ]
      }
    ]
  })
}

# SNS policy for publishing notifications
resource "aws_iam_role_policy" "lambda_sns" {
  name = "${var.name_prefix}-lambda-sns-${var.name_suffix}"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "sns:Publish",
          "sns:Subscribe",
          "sns:SetSubscriptionAttributes"
        ]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# Cognito policy for user management
resource "aws_iam_role_policy" "lambda_cognito" {
  name = "${var.name_prefix}-lambda-cognito-${var.name_suffix}"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers",
          "cognito-idp:ListUsersInGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# LAMBDA LAYER FOR SHARED DEPENDENCIES + BACKEND CODE
# ============================================================================
#
# The layer is built by running: node scripts/build.js
# This installs node_modules and copies shared backend code into build/layer/
#
# Layer structure at runtime (/opt/):
#   nodejs/
#     node_modules/    (npm production dependencies)
#     shared/
#       services/
#         cognito.js
#         dynamodb.js
#         email.js
#       utils/
#         response.js
#

resource "null_resource" "build_layer" {
  triggers = {
    package_json = filemd5("${path.module}/../../../backend/package.json")
    cognito_js   = filemd5("${path.module}/../../../backend/src/services/cognito.js")
    dynamodb_js  = filemd5("${path.module}/../../../backend/src/services/dynamodb.js")
    sns_js       = filemd5("${path.module}/../../../backend/src/services/sns.js")
    response_js  = filemd5("${path.module}/../../../backend/src/utils/response.js")
  }

  provisioner "local-exec" {
    command     = "node scripts/build.js"
    working_dir = "${abspath("${path.module}/../../..")}"
  }
}

data "archive_file" "lambda_layer" {
  type        = "zip"
  source_dir  = "${path.module}/../../../build/layer"
  output_path = "${path.module}/lambda_layer.zip"

  depends_on = [null_resource.build_layer]
}

resource "aws_lambda_layer_version" "dependencies" {
  layer_name          = "${var.name_prefix}-dependencies-${var.name_suffix}"
  description         = "Shared dependencies and backend services for Lambda functions"
  compatible_runtimes = [local.lambda_runtime]

  filename         = data.archive_file.lambda_layer.output_path
  source_code_hash = data.archive_file.lambda_layer.output_base64sha256
}

# ============================================================================
# CREATE TASK LAMBDA
# ============================================================================
resource "aws_lambda_function" "create_task" {
  function_name = "${var.name_prefix}-create-task-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.create_task.output_path
  source_code_hash = data.archive_file.create_task.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-create-task"
    Function = "CreateTask"
  }
}

data "archive_file" "create_task" {
  type        = "zip"
  output_path = "${path.module}/functions/create-task.zip"
  source_dir  = "${path.module}/src/create-task"
}

# ============================================================================
# GET TASKS LAMBDA
# ============================================================================
resource "aws_lambda_function" "get_tasks" {
  function_name = "${var.name_prefix}-get-tasks-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.get_tasks.output_path
  source_code_hash = data.archive_file.get_tasks.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-get-tasks"
    Function = "GetTasks"
  }
}

data "archive_file" "get_tasks" {
  type        = "zip"
  output_path = "${path.module}/functions/get-tasks.zip"
  source_dir  = "${path.module}/src/get-tasks"
}

# ============================================================================
# GET TASK (Single) LAMBDA
# ============================================================================
resource "aws_lambda_function" "get_task" {
  function_name = "${var.name_prefix}-get-task-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.get_task.output_path
  source_code_hash = data.archive_file.get_task.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-get-task"
    Function = "GetTask"
  }
}

data "archive_file" "get_task" {
  type        = "zip"
  output_path = "${path.module}/functions/get-task.zip"
  source_dir  = "${path.module}/src/get-task"
}

# ============================================================================
# UPDATE TASK LAMBDA
# ============================================================================
resource "aws_lambda_function" "update_task" {
  function_name = "${var.name_prefix}-update-task-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.update_task.output_path
  source_code_hash = data.archive_file.update_task.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-update-task"
    Function = "UpdateTask"
  }
}

data "archive_file" "update_task" {
  type        = "zip"
  output_path = "${path.module}/functions/update-task.zip"
  source_dir  = "${path.module}/src/update-task"
}

# ============================================================================
# DELETE TASK LAMBDA
# ============================================================================
resource "aws_lambda_function" "delete_task" {
  function_name = "${var.name_prefix}-delete-task-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.delete_task.output_path
  source_code_hash = data.archive_file.delete_task.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-delete-task"
    Function = "DeleteTask"
  }
}

data "archive_file" "delete_task" {
  type        = "zip"
  output_path = "${path.module}/functions/delete-task.zip"
  source_dir  = "${path.module}/src/delete-task"
}

# ============================================================================
# ASSIGN TASK LAMBDA
# ============================================================================
resource "aws_lambda_function" "assign_task" {
  function_name = "${var.name_prefix}-assign-task-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.assign_task.output_path
  source_code_hash = data.archive_file.assign_task.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-assign-task"
    Function = "AssignTask"
  }
}

data "archive_file" "assign_task" {
  type        = "zip"
  output_path = "${path.module}/functions/assign-task.zip"
  source_dir  = "${path.module}/src/assign-task"
}

# ============================================================================
# UPDATE STATUS LAMBDA
# ============================================================================
resource "aws_lambda_function" "update_status" {
  function_name = "${var.name_prefix}-update-status-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.update_status.output_path
  source_code_hash = data.archive_file.update_status.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-update-status"
    Function = "UpdateStatus"
  }
}

data "archive_file" "update_status" {
  type        = "zip"
  output_path = "${path.module}/functions/update-status.zip"
  source_dir  = "${path.module}/src/update-status"
}

# ============================================================================
# GET USERS LAMBDA
# ============================================================================
resource "aws_lambda_function" "get_users" {
  function_name = "${var.name_prefix}-get-users-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.get_users.output_path
  source_code_hash = data.archive_file.get_users.output_base64sha256

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Name     = "${var.name_prefix}-get-users"
    Function = "GetUsers"
  }
}

data "archive_file" "get_users" {
  type        = "zip"
  output_path = "${path.module}/functions/get-users.zip"
  source_dir  = "${path.module}/src/get-users"
}

# ============================================================================
# POST CONFIRMATION LAMBDA (Cognito Trigger)
# ============================================================================
resource "aws_lambda_function" "post_confirmation" {
  function_name = "${var.name_prefix}-post-confirmation-${var.name_suffix}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory
  layers        = [aws_lambda_layer_version.dependencies.arn]

  filename         = data.archive_file.post_confirmation.output_path
  source_code_hash = data.archive_file.post_confirmation.output_base64sha256

  # Uses its own env vars WITHOUT cognito_user_pool_id to avoid circular dependency.
  # The handler reads userPoolId from the Cognito trigger event instead.
  environment {
    variables = {
      NODE_ENV             = var.environment
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
      TASKS_TABLE_NAME     = var.tasks_table_name
      USERS_TABLE_NAME     = var.users_table_name
      SNS_TOPIC_ARN        = var.sns_topic_arn
      AWS_REGION_NAME      = var.aws_region
      CORS_ALLOWED_ORIGIN  = var.cors_allowed_origin
    }
  }

  tags = {
    Name     = "${var.name_prefix}-post-confirmation"
    Function = "PostConfirmation"
  }
}

data "archive_file" "post_confirmation" {
  type        = "zip"
  output_path = "${path.module}/functions/post-confirmation.zip"
  source_dir  = "${path.module}/src/post-confirmation"
}

# ============================================================================
# CLOUDWATCH LOG GROUPS
# ============================================================================
resource "aws_cloudwatch_log_group" "create_task" {
  name              = "/aws/lambda/${aws_lambda_function.create_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "get_tasks" {
  name              = "/aws/lambda/${aws_lambda_function.get_tasks.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "get_task" {
  name              = "/aws/lambda/${aws_lambda_function.get_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "update_task" {
  name              = "/aws/lambda/${aws_lambda_function.update_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "delete_task" {
  name              = "/aws/lambda/${aws_lambda_function.delete_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "assign_task" {
  name              = "/aws/lambda/${aws_lambda_function.assign_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "update_status" {
  name              = "/aws/lambda/${aws_lambda_function.update_status.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "get_users" {
  name              = "/aws/lambda/${aws_lambda_function.get_users.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "post_confirmation" {
  name              = "/aws/lambda/${aws_lambda_function.post_confirmation.function_name}"
  retention_in_days = 14
}
