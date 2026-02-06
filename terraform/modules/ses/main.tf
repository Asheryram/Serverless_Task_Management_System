# SES Module - Email Notifications
# Note: In production, you need to verify the domain and move out of sandbox mode

# Email identity for sending
resource "aws_ses_email_identity" "from_email" {
  count = var.from_email != "" ? 1 : 0
  email = var.from_email
}

# Admin email identity (for receiving notifications)
resource "aws_ses_email_identity" "admin_email" {
  count = var.admin_email != "" ? 1 : 0
  email = var.admin_email
}

# Optional: Domain identity for production
resource "aws_ses_domain_identity" "main" {
  count  = var.domain != "" ? 1 : 0
  domain = var.domain
}

# Domain verification record
resource "aws_ses_domain_identity_verification" "main" {
  count  = var.domain != "" ? 1 : 0
  domain = aws_ses_domain_identity.main[0].id

  depends_on = [aws_ses_domain_identity.main]
}

# DKIM for domain
resource "aws_ses_domain_dkim" "main" {
  count  = var.domain != "" ? 1 : 0
  domain = aws_ses_domain_identity.main[0].domain
}

# Email templates
resource "aws_ses_template" "task_assigned" {
  name    = "${var.name_prefix}-task-assigned"
  subject = "Task Assigned: {{taskTitle}}"
  html    = <<-EOF
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .task-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .label { font-weight: bold; color: #6b7280; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been assigned a new task:</p>
          <div class="task-details">
            <p><span class="label">Task:</span> {{taskTitle}}</p>
            <p><span class="label">Description:</span> {{taskDescription}}</p>
            <p><span class="label">Priority:</span> {{taskPriority}}</p>
            <p><span class="label">Due Date:</span> {{taskDueDate}}</p>
            <p><span class="label">Assigned By:</span> {{assignerName}}</p>
          </div>
          <p>Please log in to the Task Management System to view more details and update the task status.</p>
        </div>
        <div class="footer">
          <p>Task Management System - AmaliTech</p>
        </div>
      </div>
    </body>
    </html>
  EOF
  text    = <<-EOF
    New Task Assigned
    
    Hello,
    
    You have been assigned a new task:
    
    Task: {{taskTitle}}
    Description: {{taskDescription}}
    Priority: {{taskPriority}}
    Due Date: {{taskDueDate}}
    Assigned By: {{assignerName}}
    
    Please log in to the Task Management System to view more details and update the task status.
    
    Task Management System - AmaliTech
  EOF
}

resource "aws_ses_template" "status_update" {
  name    = "${var.name_prefix}-status-update"
  subject = "Task Status Updated: {{taskTitle}}"
  html    = <<-EOF
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .status-change { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .old-status { color: #ef4444; text-decoration: line-through; }
        .new-status { color: #059669; font-weight: bold; }
        .arrow { margin: 0 10px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Task Status Updated</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>The status of a task you're involved with has been updated:</p>
          <div class="status-change">
            <p><strong>{{taskTitle}}</strong></p>
            <p>
              <span class="old-status">{{oldStatus}}</span>
              <span class="arrow">→</span>
              <span class="new-status">{{newStatus}}</span>
            </p>
            <p>Updated by: {{updaterName}}</p>
          </div>
          <p>Please log in to the Task Management System to view more details.</p>
        </div>
        <div class="footer">
          <p>Task Management System - AmaliTech</p>
        </div>
      </div>
    </body>
    </html>
  EOF
  text    = <<-EOF
    Task Status Updated
    
    Hello,
    
    The status of a task you're involved with has been updated:
    
    Task: {{taskTitle}}
    Previous Status: {{oldStatus}}
    New Status: {{newStatus}}
    Updated By: {{updaterName}}
    
    Please log in to the Task Management System to view more details.
    
    Task Management System - AmaliTech
  EOF
}
