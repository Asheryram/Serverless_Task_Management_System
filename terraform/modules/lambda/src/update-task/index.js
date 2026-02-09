// Update Task Lambda Handler
// Admins can update any task, members cannot update tasks

const { getTaskById, updateTask } = require('shared/services/dynamodb');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');



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
    
    // Check if task exists using service
    const task = await getTaskById(taskId);
    
    if (!task) {
      return response(404, { message: 'Task not found' });
    }
    
    // Build updates object
    const updates = {};
    const allowedFields = ['title', 'description', 'priority', 'dueDate', 'tags'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return response(400, { message: 'No valid fields to update' });
    }
    
    // Update task using service
    const updatedTask = await updateTask(taskId, updates);
    
    console.log('Task updated:', taskId);
    
    return response(200, {
      message: 'Task updated successfully',
      task: updatedTask
    });
    
  } catch (error) {
    console.error('Error updating task:', error);
    return response(500, { 
      message: 'Failed to update task',
      error: error.message 
    });
  }
};
