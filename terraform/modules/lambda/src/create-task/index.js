// Create Task Lambda Handler
// Only admins can create tasks

const crypto = require('crypto');
const { createTask } = require('shared/services/dynamodb');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');

// Generate UUID using native crypto
const generateUUID = () => crypto.randomUUID();



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
    const taskData = {
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
    
    // Save to DynamoDB using service
    const task = await createTask(taskData);
    
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
