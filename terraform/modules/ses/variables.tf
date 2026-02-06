variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "domain" {
  description = "Domain for SES"
  type        = string
  default     = ""
}

variable "from_email" {
  description = "From email address"
  type        = string
  default     = ""
}

variable "admin_email" {
  description = "Admin email address"
  type        = string
  default     = ""
}
