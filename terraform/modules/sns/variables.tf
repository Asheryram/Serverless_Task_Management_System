variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "notification_emails" {
  description = "List of email addresses to subscribe to SNS notifications"
  type        = list(string)
  default     = []
}