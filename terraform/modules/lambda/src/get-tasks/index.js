// Get Tasks Lambda Handler
// Returns all tasks for admins, only assigned tasks for members

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
    
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status;
    const limit = parseInt(queryParams.limit) || 50;
    
    let tasks;
    
    if (isAdmin(user)) {
      // Admins can see all tasks
      if (status) {
        // Query by status using GSI
        const result = await docClient.send(new QueryCommand({
          TableName: TASKS_TABLE,
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': status
          },
          Limit: limit,
          ScanIndexForward: false // Most recent first
        }));
        tasks = result.Items;
      } else {
        // Scan all tasks
        const result = await docClient.send(new ScanCommand({
          TableName: TASKS_TABLE,
          Limit: limit
        }));
        tasks = result.Items;
      }
    } else {
      // Members can only see tasks assigned to them
      const result = await docClient.send(new ScanCommand({
        TableName: TASKS_TABLE,
        FilterExpression: 'contains(assignedMembers, :userId)',
        ExpressionAttributeValues: {
          ':userId': user.userId
        },
        Limit: limit
      }));
      tasks = result.Items;
      
      // Filter by status if provided
      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }
    }
    
    // Sort by updatedAt descending
    tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return response(200, {
      tasks,
      count: tasks.length,
      isAdmin: isAdmin(user)
    });
    
  } catch (error) {
    console.error('Error getting tasks:', error);
    return response(500, { 
      message: 'Failed to retrieve tasks',
      error: error.message 
    });
  }
};
