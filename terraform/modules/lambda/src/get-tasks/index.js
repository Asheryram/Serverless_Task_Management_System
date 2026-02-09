// Get Tasks Lambda Handler
// Returns all tasks for admins, only assigned tasks for members

const { getAllTasks, getTasksForUser } = require('shared/services/dynamodb');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');



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
      // Admins can see all tasks using service
      tasks = await getAllTasks(limit);
    } else {
      // Members can only see tasks assigned to them using service
      tasks = await getTasksForUser(user.userId, limit);
    }
    
    // Filter by status if provided
    if (status) {
      tasks = tasks.filter(task => task.status === status);
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
