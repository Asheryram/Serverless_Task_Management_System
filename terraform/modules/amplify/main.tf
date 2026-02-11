locals {
  has_repository = var.repository_url != "" && var.github_access_token != ""
}

resource "aws_amplify_app" "main" {
  name         = "${var.name_prefix}-frontend-${var.name_suffix}"
  repository   = local.has_repository ? var.repository_url : null
  access_token = local.has_repository ? var.github_access_token : null

  build_spec = file("${path.module}/../../../amplify.yml")

  environment_variables = {
    REACT_APP_API_URL              = var.api_gateway_url
    REACT_APP_COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    REACT_APP_COGNITO_CLIENT_ID    = var.cognito_client_id
    REACT_APP_COGNITO_DOMAIN       = var.cognito_domain
    REACT_APP_AWS_REGION           = var.aws_region
    _LIVE_UPDATES                  = "[{\"pkg\":\"node\",\"type\":\"nvm\",\"version\":\"18\"}]"
  }

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

resource "aws_amplify_branch" "main" {
  app_id            = aws_amplify_app.main.id
  branch_name       = var.branch_name
  enable_auto_build = local.has_repository  # only auto-build if GitHub is connected

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