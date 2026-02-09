// Get Users Lambda Handler
// Only admins can list users

const { listUsers } = require('shared/services/cognito');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');



exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get user from token
    const user = getUserFromEvent(event);
    if (!user) {
      return response(401, { message: 'Unauthorized' });
    }
    
    // Only admins can list users
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can list users' });
    }
    
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const group = queryParams.group; // 'Admins' or 'Members'
    
    // List users using service
    const users = await listUsers();
    
    // Filter by group if specified
    let filteredUsers = users;
    if (group) {
      filteredUsers = users.filter(u => u.group === group);
    }
    
    // Filter out disabled/inactive users
    const activeUsers = filteredUsers.filter(u => u.enabled !== false);
    
    return response(200, {
      users: activeUsers,
      count: activeUsers.length
    });
    
  } catch (error) {
    console.error('Error getting users:', error);
    return response(500, { 
      message: 'Failed to retrieve users',
      error: error.message 
    });
  }
};
