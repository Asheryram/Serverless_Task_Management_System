// Update Task Status Lambda Handler
// Members can update status of tasks assigned to them
// Admins can update any task status
// Notifies admin and all assigned members on status change

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

const TASKS_TABLE = process.env.TASKS_TABLE_NAME;
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];

// Response helper
const response = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    ...headers
  },
  body: JSON.stringify(body)
});

// Extract user info from JWT claims
const getUserFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return null;
  
  return {
    userId: claims.sub,
    email: claims.email,
    groups: claims['cognito:groups'] ? claims['cognito:groups'].split(',') : [],
    name: claims.name || claims.email
  };
};

// Check if user is admin
const isAdmin = (user) => {
  return user?.groups?.includes('Admins');
};

// Get user email from Cognito
const getUserEmail = async (userId) => {
  try {
    const result = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: userId
    }));
    
    const emailAttr = result.UserAttributes?.find(attr => attr.Name === 'email');
    return emailAttr?.Value;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

// Send status update email
const sendStatusUpdateEmail = async (toEmail, task, oldStatus, newStatus, updaterName) => {
  try {
    await sesClient.send(new SendEmailCommand({
      Source: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: `Task Status Updated: ${task.title}`
        },
        Body: {
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Task Status Update</h2>
                  <p><strong>Task:</strong> ${task.title}</p>
                  <p><strong>Previous Status:</strong> ${oldStatus}</p>
                  <p><strong>New Status:</strong> ${newStatus}</p>
                  <p><strong>Updated by:</strong> ${updaterName}</p>
                  <br/>
                  <p>Please log in to the Task Management System to view more details.</p>
                </body>
              </html>
            `
          },
          Text: {
            Data: `Task Status Update\n\nTask: ${task.title}\nPrevious Status: ${oldStatus}\nNew Status: ${newStatus}\nUpdated by: ${updaterName}\n\nPlease log in to the Task Management System to view more details.`
          }
        }
      }
    }));
    console.log('Status update email sent to:', toEmail);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get user from token
    const user = getUserFromEvent(event);
    if (!user) {
      return response(401, { message: 'Unauthorized' });
    }
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { message: 'Task ID is required' });
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { status } = body;
    
    if (!status || !VALID_STATUSES.includes(status)) {
      return response(400, { 
        message: 'Valid status is required',
        validStatuses: VALID_STATUSES 
      });
    }
    
    // Get existing task
    const existing = await docClient.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId }
    }));
    
    if (!existing.Item) {
      return response(404, { message: 'Task not found' });
    }
    
    const task = existing.Item;
    const oldStatus = task.status;
    
    // Check authorization
    if (!isAdmin(user)) {
      // Members can only update tasks assigned to them
      if (!task.assignedMembers?.includes(user.userId)) {
        return response(403, { message: 'You are not assigned to this task' });
      }
      
      // Members cannot close tasks
      if (status === 'CLOSED') {
        return response(403, { message: 'Only admins can close tasks' });
      }
    }
    
    // Don't update if status is the same
    if (oldStatus === status) {
      return response(400, { message: 'Task already has this status' });
    }
    
    // Update task status
    const result = await docClient.send(new UpdateCommand({
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, lastStatusUpdate = :lastUpdate',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
        ':lastUpdate': {
          from: oldStatus,
          to: status,
          updatedBy: user.userId,
          updatedByName: user.name,
          updatedAt: new Date().toISOString()
        }
      },
      ReturnValues: 'ALL_NEW'
    }));
    
    // Collect all email recipients (assigned members + task creator)
    const recipientIds = new Set([
      ...task.assignedMembers || [],
      task.createdBy
    ]);
    
    // Remove the user who made the update
    recipientIds.delete(user.userId);
    
    // Send email notifications
    const emailPromises = [...recipientIds].map(async (userId) => {
      const email = await getUserEmail(userId);
      if (email) {
        await sendStatusUpdateEmail(email, task, oldStatus, status, user.name);
      }
    });
    
    await Promise.all(emailPromises);
    
    console.log('Task status updated:', taskId, 'from', oldStatus, 'to', status);
    
    return response(200, {
      message: 'Task status updated successfully',
      task: result.Attributes,
      previousStatus: oldStatus
    });
    
  } catch (error) {
    console.error('Error updating task status:', error);
    return response(500, { 
      message: 'Failed to update task status',
      error: error.message 
    });
  }
};
