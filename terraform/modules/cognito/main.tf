# Cognito Module - User Authentication
# Handles user pool, client, and email domain restrictions

resource "aws_cognito_user_pool" "main" {
  name = "${var.name_prefix}-user-pool-${var.name_suffix}"

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Email verification is mandatory
  auto_verified_attributes = ["email"]
  
  # Username configuration - use email as username
  username_attributes = ["email"]
  
  username_configuration {
    case_sensitive = false
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Schema attributes
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Custom attribute for role
  schema {
    name                     = "role"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Task Management System - Verify Your Email"
    email_message        = "Your verification code is {####}. Please enter this code to verify your email address."
  }

  # MFA configuration
  mfa_configuration = "OFF"

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "AUDIT"
  }

  # Lambda triggers
  lambda_config {
    pre_sign_up       = aws_lambda_function.pre_signup_validation.arn
    post_confirmation = var.post_confirmation_lambda_arn
  }

  tags = {
    Name = "${var.name_prefix}-user-pool"
  }
}

# Pre-signup Lambda for email domain validation
resource "aws_lambda_function" "pre_signup_validation" {
  function_name = "${var.name_prefix}-pre-signup-validation-${var.name_suffix}"
  role          = aws_iam_role.pre_signup_lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 10

  filename         = data.archive_file.pre_signup_lambda.output_path
  source_code_hash = data.archive_file.pre_signup_lambda.output_base64sha256

  environment {
    variables = {
      ALLOWED_DOMAINS = join(",", var.allowed_domains)
    }
  }

  tags = {
    Name = "${var.name_prefix}-pre-signup-validation"
  }
}

# Lambda code for pre-signup validation
data "archive_file" "pre_signup_lambda" {
  type        = "zip"
  output_path = "${path.module}/lambda/pre-signup.zip"

  source {
    content = <<-EOF
      exports.handler = async (event) => {
        const email = event.request.userAttributes.email;
        const allowedDomains = process.env.ALLOWED_DOMAINS.split(',');
        
        const domain = email.split('@')[1]?.toLowerCase();
        
        if (!domain || !allowedDomains.includes(domain)) {
          throw new Error('Email domain not allowed. Only @amalitech.com and @amalitechtraining.org domains are permitted.');
        }
        
        // Auto-confirm for testing purposes (remove in production if needed)
        // event.response.autoConfirmUser = false;
        
        return event;
      };
    EOF
    filename = "index.js"
  }
}

# IAM role for pre-signup Lambda
resource "aws_iam_role" "pre_signup_lambda_role" {
  name = "${var.name_prefix}-pre-signup-lambda-role-${var.name_suffix}"

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
}

# Lambda execution policy
resource "aws_iam_role_policy_attachment" "pre_signup_lambda_basic" {
  role       = aws_iam_role.pre_signup_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Permission for Cognito to invoke Lambda
resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup_validation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Permission for Cognito to invoke post-confirmation Lambda
resource "aws_lambda_permission" "cognito_post_confirmation" {
  statement_id  = "AllowCognitoPostConfirmation"
  action        = "lambda:InvokeFunction"
  function_name = var.post_confirmation_lambda_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.name_prefix}-client-${var.name_suffix}"
  user_pool_id = aws_cognito_user_pool.main.id

  # OAuth settings
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  
  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  supported_identity_providers = ["COGNITO"]

  # Token validity
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # Generate client secret
  generate_secret = false

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read/write attributes
  read_attributes  = ["email", "name", "custom:role"]
  write_attributes = ["email", "name", "custom:role"]
}

# Cognito Domain for hosted UI
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.name_prefix}-auth-${var.name_suffix}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Admin group
resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator users with full access"
  precedence   = 1
}

# Members group
resource "aws_cognito_user_group" "members" {
  name         = "Members"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular members with limited access"
  precedence   = 10
}
