// DynamoDB Service - Database operations

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetCommand
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

const TASKS_TABLE = process.env.TASKS_TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE_NAME;

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * Create a new task
 */
const createTask = async (task) => {
  await docClient.send(new PutCommand({
    TableName: TASKS_TABLE,
    Item: task,
    ConditionExpression: 'attribute_not_exists(taskId)'
  }));
  return task;
};

/**
 * Get task by ID
 */
const getTaskById = async (taskId) => {
  const result = await docClient.send(new GetCommand({
    TableName: TASKS_TABLE,
    Key: { taskId }
  }));
  return result.Item;
};

/**
 * Update task
 */
const updateTask = async (taskId, updates) => {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString()
  };

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updates[key];
    }
  });

  updateExpressions.push('updatedAt = :updatedAt');

  const result = await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes;
};

/**
 * Delete task
 */
const deleteTask = async (taskId) => {
  await docClient.send(new DeleteCommand({
    TableName: TASKS_TABLE,
    Key: { taskId }
  }));
};

/**
 * Get all tasks (for admins)
 */
const getAllTasks = async (limit = 100) => {
  const result = await docClient.send(new ScanCommand({
    TableName: TASKS_TABLE,
    Limit: limit
  }));
  return result.Items || [];
};

/**
 * Get tasks by status
 */
const getTasksByStatus = async (status, limit = 100) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TASKS_TABLE,
    IndexName: 'StatusIndex',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status },
    Limit: limit,
    ScanIndexForward: false
  }));
  return result.Items || [];
};

/**
 * Get tasks assigned to a user
 */
const getTasksForUser = async (userId, limit = 100) => {
  const result = await docClient.send(new ScanCommand({
    TableName: TASKS_TABLE,
    FilterExpression: 'contains(assignedMembers, :userId)',
    ExpressionAttributeValues: { ':userId': userId },
    Limit: limit
  }));
  return result.Items || [];
};

/**
 * Get tasks created by a user
 */
const getTasksCreatedBy = async (userId, limit = 100) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TASKS_TABLE,
    IndexName: 'CreatedByIndex',
    KeyConditionExpression: 'createdBy = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    Limit: limit,
    ScanIndexForward: false
  }));
  return result.Items || [];
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create a new user
 */
const createUser = async (user) => {
  await docClient.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: user
  }));
  return user;
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId }
  }));
  return result.Item;
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  const result = await docClient.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email }
  }));
  return result.Items?.[0];
};

/**
 * Update user
 */
const updateUser = async (userId, updates) => {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString()
  };

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updates[key];
    }
  });

  updateExpressions.push('updatedAt = :updatedAt');

  const result = await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes;
};

/**
 * Get all users
 */
const getAllUsers = async (limit = 100) => {
  const result = await docClient.send(new ScanCommand({
    TableName: USERS_TABLE,
    Limit: limit
  }));
  return result.Items || [];
};

/**
 * Get users by role
 */
const getUsersByRole = async (role, limit = 100) => {
  const result = await docClient.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'RoleIndex',
    KeyConditionExpression: '#role = :role',
    ExpressionAttributeNames: { '#role': 'role' },
    ExpressionAttributeValues: { ':role': role },
    Limit: limit
  }));
  return result.Items || [];
};

/**
 * Get multiple users by IDs
 */
const getUsersByIds = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];

  const keys = userIds.map(userId => ({ userId }));
  
  const result = await docClient.send(new BatchGetCommand({
    RequestItems: {
      [USERS_TABLE]: { Keys: keys }
    }
  }));

  return result.Responses?.[USERS_TABLE] || [];
};

/**
 * Add activity log entry to a task
 * Uses DynamoDB list_append to atomically append to the activityLog array
 */
const addTaskActivityLog = async (taskId, activity) => {
  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...activity
  };

  try {
    await docClient.send(new UpdateCommand({
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: 'SET activityLog = list_append(if_not_exists(activityLog, :emptyList), :newActivity), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':newActivity': [logEntry],
        ':emptyList': [],
        ':updatedAt': new Date().toISOString()
      }
    }));
    return logEntry;
  } catch (error) {
    console.error('Error adding activity log:', error);
    throw error;
  }
};

module.exports = {
  // Task operations
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getAllTasks,
  getTasksByStatus,
  getTasksForUser,
  getTasksCreatedBy,
  addTaskActivityLog,
  
  // User operations
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  getAllUsers,
  getUsersByRole,
  getUsersByIds
};
