// Update Task Lambda Handler
// Admins can update any task, members cannot update tasks

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TASKS_TABLE = process.env.TASKS_TABLE_NAME;

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

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get user from token
    const user = getUserFromEvent(event);
    if (!user) {
      return response(401, { message: 'Unauthorized' });
    }
    
    // Only admins can update task details (not status)
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can update task details' });
    }
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { message: 'Task ID is required' });
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    
    // Check if task exists
    const existing = await docClient.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId }
    }));
    
    if (!existing.Item) {
      return response(404, { message: 'Task not found' });
    }
    
    // Build update expression
    const updates = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };
    
    // Allowed fields to update
    const allowedFields = ['title', 'description', 'priority', 'dueDate', 'tags'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    }
    
    if (updates.length === 0) {
      return response(400, { message: 'No valid fields to update' });
    }
    
    updates.push('updatedAt = :updatedAt');
    
    // Update task in DynamoDB
    const result = await docClient.send(new UpdateCommand({
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));
    
    console.log('Task updated:', taskId);
    
    return response(200, {
      message: 'Task updated successfully',
      task: result.Attributes
    });
    
  } catch (error) {
    console.error('Error updating task:', error);
    return response(500, { 
      message: 'Failed to update task',
      error: error.message 
    });
  }
};
