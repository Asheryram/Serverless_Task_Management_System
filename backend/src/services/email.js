// Email Service - Send notifications via AWS SES

const { SESClient, SendEmailCommand, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({});

const FROM_EMAIL = process.env.SES_FROM_EMAIL;

/**
 * Send a basic email
 */
const sendEmail = async ({ to, subject, htmlBody, textBody }) => {
  const toAddresses = Array.isArray(to) ? to : [to];
  
  try {
    await sesClient.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: toAddresses
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: textBody }
        }
      }
    }));
    
    console.log(`Email sent to: ${toAddresses.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

/**
 * Send task assignment notification
 */
const sendTaskAssignmentEmail = async ({ toEmail, task, assignerName }) => {
  const subject = `Task Assigned: ${task.title}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9fafb; }
        .task-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .value { color: #111827; margin-bottom: 15px; }
        .priority-high { color: #ef4444; }
        .priority-medium { color: #f59e0b; }
        .priority-low { color: #10b981; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;">📋 New Task Assigned</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>You have been assigned a new task. Here are the details:</p>
        
        <div class="task-card">
          <div class="label">Task Title</div>
          <div class="value" style="font-size: 18px; font-weight: bold;">${task.title}</div>
          
          <div class="label">Description</div>
          <div class="value">${task.description || 'No description provided'}</div>
          
          <div class="label">Priority</div>
          <div class="value priority-${task.priority?.toLowerCase()}">${task.priority || 'MEDIUM'}</div>
          
          <div class="label">Due Date</div>
          <div class="value">${task.dueDate || 'Not set'}</div>
          
          <div class="label">Assigned By</div>
          <div class="value">${assignerName}</div>
        </div>
        
        <p>Please log in to the Task Management System to view more details and start working on this task.</p>
      </div>
      <div class="footer">
        <p>Task Management System - AmaliTech</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
  
  const textBody = `
New Task Assigned

Hello,

You have been assigned a new task:

Task: ${task.title}
Description: ${task.description || 'No description provided'}
Priority: ${task.priority || 'MEDIUM'}
Due Date: ${task.dueDate || 'Not set'}
Assigned By: ${assignerName}

Please log in to the Task Management System to view more details.

Task Management System - AmaliTech
  `;
  
  return sendEmail({
    to: toEmail,
    subject,
    htmlBody,
    textBody
  });
};

/**
 * Send task status update notification
 */
const sendStatusUpdateEmail = async ({ toEmail, task, oldStatus, newStatus, updaterName }) => {
  const subject = `Task Status Updated: ${task.title}`;
  
  const statusColors = {
    'OPEN': '#3b82f6',
    'IN_PROGRESS': '#f59e0b',
    'COMPLETED': '#10b981',
    'CLOSED': '#6b7280'
  };
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9fafb; }
        .status-change { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; text-align: center; }
        .task-title { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
        .status-container { display: flex; align-items: center; justify-content: center; gap: 15px; }
        .status { padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .old-status { background: #fee2e2; color: #991b1b; text-decoration: line-through; }
        .new-status { background: #d1fae5; color: #065f46; }
        .arrow { font-size: 24px; color: #9ca3af; }
        .updater { margin-top: 15px; color: #6b7280; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0;">🔄 Task Status Updated</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>The status of a task you're involved with has been updated:</p>
        
        <div class="status-change">
          <div class="task-title">${task.title}</div>
          <div>
            <span class="status old-status">${oldStatus}</span>
            <span class="arrow">→</span>
            <span class="status new-status">${newStatus}</span>
          </div>
          <div class="updater">Updated by: ${updaterName}</div>
        </div>
        
        <p>Please log in to the Task Management System to view more details.</p>
      </div>
      <div class="footer">
        <p>Task Management System - AmaliTech</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
  
  const textBody = `
Task Status Updated

Hello,

The status of a task you're involved with has been updated:

Task: ${task.title}
Previous Status: ${oldStatus}
New Status: ${newStatus}
Updated By: ${updaterName}

Please log in to the Task Management System to view more details.

Task Management System - AmaliTech
  `;
  
  return sendEmail({
    to: toEmail,
    subject,
    htmlBody,
    textBody
  });
};

/**
 * Send bulk notifications
 */
const sendBulkNotifications = async (emails, notificationFn) => {
  const results = await Promise.allSettled(
    emails.map(emailData => notificationFn(emailData))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - successful;
  
  console.log(`Bulk notifications: ${successful} sent, ${failed} failed`);
  
  return { successful, failed };
};

module.exports = {
  sendEmail,
  sendTaskAssignmentEmail,
  sendStatusUpdateEmail,
  sendBulkNotifications
};
