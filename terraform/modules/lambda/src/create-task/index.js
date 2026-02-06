// Create Task Lambda Handler
// Only admins can create tasks

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TASKS_TABLE = process.env.TASKS_TABLE_NAME;

// Generate UUID using native crypto
const generateUUID = () => crypto.randomUUID();

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
    
    // Check admin role
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can create tasks' });
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!body.title) {
      return response(400, { message: 'Task title is required' });
    }
    
    // Create task object
    const now = new Date().toISOString();
    const task = {
      taskId: generateUUID(),
      title: body.title,
      description: body.description || '',
      status: 'OPEN',
      priority: body.priority || 'MEDIUM',
      createdBy: user.userId,
      createdByEmail: user.email,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
      dueDate: body.dueDate || null,
      assignedMembers: [],
      tags: body.tags || []
    };
    
    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TASKS_TABLE,
      Item: task
    }));
    
    console.log('Task created:', task.taskId);
    
    return response(201, {
      message: 'Task created successfully',
      task
    });
    
  } catch (error) {
    console.error('Error creating task:', error);
    return response(500, { 
      message: 'Failed to create task',
      error: error.message 
    });
  }
};
