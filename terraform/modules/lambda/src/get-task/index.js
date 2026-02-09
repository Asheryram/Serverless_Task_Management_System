// Get Single Task Lambda Handler
// Returns task details - admins see all, members see only assigned

const { getTaskById } = require('shared/services/dynamodb');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');



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
    
    // Get task using service
    const task = await getTaskById(taskId);
    
    if (!task) {
      return response(404, { message: 'Task not found' });
    }
    
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
