// Get Single Task Lambda Handler
// Returns task details - admins see all, members see only assigned

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

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
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { message: 'Task ID is required' });
    }
    
    // Get task from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId }
    }));
    
    if (!result.Item) {
      return response(404, { message: 'Task not found' });
    }
    
    const task = result.Item;
    
    // Check authorization
    if (!isAdmin(user)) {
      // Members can only see tasks assigned to them
      if (!task.assignedMembers?.includes(user.userId)) {
        return response(403, { message: 'You are not assigned to this task' });
      }
    }
    
    return response(200, { task });
    
  } catch (error) {
    console.error('Error getting task:', error);
    return response(500, { 
      message: 'Failed to retrieve task',
      error: error.message 
    });
  }
};
