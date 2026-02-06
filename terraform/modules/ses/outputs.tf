output "from_email_arn" {
  description = "From email identity ARN"
  value       = length(aws_ses_email_identity.from_email) > 0 ? aws_ses_email_identity.from_email[0].arn : null
}

output "domain_identity_arn" {
  description = "Domain identity ARN"
  value       = length(aws_ses_domain_identity.main) > 0 ? aws_ses_domain_identity.main[0].arn : null
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS configuration"
  value       = length(aws_ses_domain_dkim.main) > 0 ? aws_ses_domain_dkim.main[0].dkim_tokens : []
}

output "task_assigned_template_name" {
  description = "Task assigned email template name"
  value       = aws_ses_template.task_assigned.name
}

output "status_update_template_name" {
  description = "Status update email template name"
  value       = aws_ses_template.status_update.name
}
