// Assign Task Lambda Handler
// Only admins can assign tasks to members
// Sends email notification to assigned members

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

const TASKS_TABLE = process.env.TASKS_TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE_NAME;
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

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

// Send email notification
const sendAssignmentEmail = async (toEmail, task, assignerName) => {
  try {
    await sesClient.send(new SendEmailCommand({
      Source: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: `Task Assigned: ${task.title}`
        },
        Body: {
          Html: {
            Data: `
              <html>
                <body>
                  <h2>You have been assigned a new task</h2>
                  <p><strong>Task:</strong> ${task.title}</p>
                  <p><strong>Description:</strong> ${task.description || 'No description'}</p>
                  <p><strong>Priority:</strong> ${task.priority}</p>
                  <p><strong>Due Date:</strong> ${task.dueDate || 'Not set'}</p>
                  <p><strong>Assigned by:</strong> ${assignerName}</p>
                  <br/>
                  <p>Please log in to the Task Management System to view more details.</p>
                </body>
              </html>
            `
          },
          Text: {
            Data: `You have been assigned a new task: ${task.title}\n\nDescription: ${task.description || 'No description'}\nPriority: ${task.priority}\nDue Date: ${task.dueDate || 'Not set'}\nAssigned by: ${assignerName}\n\nPlease log in to the Task Management System to view more details.`
          }
        }
      }
    }));
    console.log('Email sent to:', toEmail);
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
    
    // Only admins can assign tasks
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can assign tasks' });
    }
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { message: 'Task ID is required' });
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { memberIds } = body;
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return response(400, { message: 'memberIds array is required' });
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
    const existingMembers = task.assignedMembers || [];
    
    // Find new members (prevent duplicates)
    const newMembers = memberIds.filter(id => !existingMembers.includes(id));
    
    if (newMembers.length === 0) {
      return response(400, { message: 'All members are already assigned to this task' });
    }
    
    // Update task with new assignments
    const allMembers = [...new Set([...existingMembers, ...newMembers])];
    
    const result = await docClient.send(new UpdateCommand({
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: 'SET assignedMembers = :members, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':members': allMembers,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));
    
    // Send email notifications to new members
    const emailPromises = newMembers.map(async (memberId) => {
      const email = await getUserEmail(memberId);
      if (email) {
        await sendAssignmentEmail(email, task, user.name);
      }
    });
    
    await Promise.all(emailPromises);
    
    console.log('Task assigned:', taskId, 'to members:', newMembers);
    
    return response(200, {
      message: 'Task assigned successfully',
      task: result.Attributes,
      newlyAssigned: newMembers
    });
    
  } catch (error) {
    console.error('Error assigning task:', error);
    return response(500, { 
      message: 'Failed to assign task',
      error: error.message 
    });
  }
};
