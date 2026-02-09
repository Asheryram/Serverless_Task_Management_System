variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "name_suffix" {
  description = "Suffix for resource names"
  type        = string
}

variable "allowed_domains" {
  description = "List of allowed email domains for signup"
  type        = list(string)
  default     = ["amalitech.com", "amalitechtraining.org"]
}

variable "ses_from_email" {
  description = "From email for SES"
  type        = string
  default     = ""
}

variable "callback_urls" {
  description = "Allowed callback URLs"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "logout_urls" {
  description = "Allowed logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000/logout"]
}

variable "post_confirmation_lambda_arn" {
  description = "ARN of the post-confirmation Lambda function"
  type        = string
}

variable "post_confirmation_lambda_name" {
  description = "Name of the post-confirmation Lambda function"
  type        = string
}
