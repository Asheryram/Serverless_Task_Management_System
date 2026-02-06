// Delete Task Lambda Handler
// Only admins can delete tasks

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

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
    
    // Only admins can delete tasks
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can delete tasks' });
    }
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { message: 'Task ID is required' });
    }
    
    // Check if task exists
    const existing = await docClient.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId }
    }));
    
    if (!existing.Item) {
      return response(404, { message: 'Task not found' });
    }
    
    // Delete task from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: TASKS_TABLE,
      Key: { taskId }
    }));
    
    console.log('Task deleted:', taskId);
    
    return response(200, {
      message: 'Task deleted successfully',
      taskId
    });
    
  } catch (error) {
    console.error('Error deleting task:', error);
    return response(500, { 
      message: 'Failed to delete task',
      error: error.message 
    });
  }
};
