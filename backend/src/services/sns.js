// SNS Service - Send email notifications via AWS SNS

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({});
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;

/**
 * Send task assignment email notification via SNS
 */
const sendTaskAssignmentEmail = async ({ toEmail, task, assignerName }) => {
  const subject = `Task Assigned: ${task.title}`;
  const message = `Hello,

You have been assigned a new task:

Task: ${task.title}
Description: ${task.description || 'No description provided'}
Priority: ${task.priority || 'MEDIUM'}
Due Date: ${task.dueDate || 'Not set'}
Assigned By: ${assignerName}

Please log in to the Task Management System to view more details.

Task Management System`;

  try {
    await snsClient.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message: JSON.stringify({
        default: message,
        email: message
      }),
      Subject: subject,
      MessageStructure: 'json',
      MessageAttributes: {
        email: {
          DataType: 'String',
          StringValue: toEmail
        }
      }
    }));
    
    console.log(`SNS email notification sent for task assignment to: ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send SNS email notification:', error);
    return false;
  }
};

/**
 * Send task status update email notification via SNS
 */
const sendStatusUpdateEmail = async ({ toEmail, task, oldStatus, newStatus, updaterName }) => {
  const subject = `Task Status Updated: ${task.title}`;
  const message = `Hello,

The status of a task you're involved with has been updated:

Task: ${task.title}
Previous Status: ${oldStatus}
New Status: ${newStatus}
Updated By: ${updaterName}

Please log in to the Task Management System to view more details.

Task Management System`;

  try {
    await snsClient.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message: JSON.stringify({
        default: message,
        email: message
      }),
      Subject: subject,
      MessageStructure: 'json',
      MessageAttributes: {
        email: {
          DataType: 'String',
          StringValue: toEmail
        }
      }
    }));
    
    console.log(`SNS email notification sent for status update to: ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send SNS email notification:', error);
    return false;
  }
};

/**
 * Send bulk email notifications via SNS
 */
const sendBulkNotifications = async (emails, notificationFn) => {
  const results = await Promise.allSettled(
    emails.map(emailData => notificationFn(emailData))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - successful;
  
  console.log(`Bulk SNS notifications: ${successful} sent, ${failed} failed`);
  
  return { successful, failed };
};

module.exports = {
  sendTaskAssignmentEmail,
  sendStatusUpdateEmail,
  sendBulkNotifications
};