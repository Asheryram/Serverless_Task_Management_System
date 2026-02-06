# Amplify Module - Frontend Hosting
# Hosts the React application
# Note: When repository_url is empty, this creates a manual deployment app

resource "aws_amplify_app" "main" {
  name = "${var.name_prefix}-frontend-${var.name_suffix}"

  # Build settings for manual deployment
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: build
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  # Environment variables for the frontend
  environment_variables = {
    REACT_APP_API_URL              = var.api_gateway_url
    REACT_APP_COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    REACT_APP_COGNITO_CLIENT_ID    = var.cognito_client_id
    REACT_APP_COGNITO_DOMAIN       = var.cognito_domain
    REACT_APP_AWS_REGION           = var.aws_region
    _LIVE_UPDATES                  = "[{\"pkg\":\"node\",\"type\":\"nvm\",\"version\":\"18\"}]"
  }

  # Custom rules for SPA routing
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }

  tags = {
    Name        = "${var.name_prefix}-frontend"
    Environment = var.environment
  }
}

# Branch for manual deployment
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = var.branch_name

  framework = "React"
  stage     = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  environment_variables = {
    REACT_APP_ENVIRONMENT = var.environment
  }

  tags = {
    Name   = "${var.name_prefix}-branch-${var.branch_name}"
    Branch = var.branch_name
  }
}
