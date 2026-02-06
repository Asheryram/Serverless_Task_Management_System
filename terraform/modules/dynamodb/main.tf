# DynamoDB Module - Database Tables
# Creates Tasks and Users tables with proper indexes

# ============================================================================
# TASKS TABLE
# ============================================================================
resource "aws_dynamodb_table" "tasks" {
  name           = "${var.name_prefix}-tasks-${var.name_suffix}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "taskId"

  # Primary key
  attribute {
    name = "taskId"
    type = "S"
  }

  # GSI attributes
  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdBy"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # Global Secondary Index - Query by status
  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # Global Secondary Index - Query by creator
  global_secondary_index {
    name            = "CreatedByIndex"
    hash_key        = "createdBy"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # TTL for task archival (optional)
  ttl {
    attribute_name = "ttl"
    enabled        = false
  }

  tags = {
    Name        = "${var.name_prefix}-tasks"
    Environment = var.environment
  }
}

# ============================================================================
# USERS TABLE
# ============================================================================
resource "aws_dynamodb_table" "users" {
  name           = "${var.name_prefix}-users-${var.name_suffix}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  # Primary key
  attribute {
    name = "userId"
    type = "S"
  }

  # GSI attributes
  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "role"
    type = "S"
  }

  # Global Secondary Index - Query by email
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  # Global Secondary Index - Query by role
  global_secondary_index {
    name            = "RoleIndex"
    hash_key        = "role"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.name_prefix}-users"
    Environment = var.environment
  }
}

# ============================================================================
# TASK ASSIGNMENTS TABLE (for tracking assignments)
# ============================================================================
resource "aws_dynamodb_table" "task_assignments" {
  name           = "${var.name_prefix}-task-assignments-${var.name_suffix}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "taskId"
  range_key      = "userId"

  attribute {
    name = "taskId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  # GSI to query assignments by user
  global_secondary_index {
    name            = "UserAssignmentsIndex"
    hash_key        = "userId"
    range_key       = "taskId"
    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.name_prefix}-task-assignments"
    Environment = var.environment
  }
}
