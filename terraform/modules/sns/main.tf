# SNS Topic for Task Management Notifications
resource "aws_sns_topic" "task_notifications" {
  name = "${var.project_name}-task-notifications"
  
}

# SNS Topic Policy
resource "aws_sns_topic_policy" "task_notifications_policy" {
  arn = aws_sns_topic.task_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sns:Publish"
        Resource = aws_sns_topic.task_notifications.arn
      }
    ]
  })
}

# Email subscription for notifications
resource "aws_sns_topic_subscription" "email_notifications" {
  count     = length(var.notification_emails)
  topic_arn = aws_sns_topic.task_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_emails[count.index]
}