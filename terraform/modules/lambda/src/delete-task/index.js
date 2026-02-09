// Delete Task Lambda Handler
// Only admins can delete tasks

const { getTaskById, deleteTask } = require('shared/services/dynamodb');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');



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
    
    // Check if task exists using service
    const task = await getTaskById(taskId);
    
    if (!task) {
      return response(404, { message: 'Task not found' });
    }
    
    // Delete task using service
    await deleteTask(taskId);
    
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
