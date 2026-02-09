// Assign Task Lambda Handler
// Only admins can assign tasks to members
// Sends email notification to assigned members

const { getTaskById, updateTask } = require('shared/services/dynamodb');
const { getUserEmail } = require('shared/services/cognito');
const { sendTaskAssignmentEmail } = require('shared/services/email');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');



exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get user from token
    const user = getUserFromEvent(event);
    if (!user) {
      return response(401, { message: 'Unauthorized' });
    }
    
    // Only admins can assign tasks
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can assign tasks' });
    }
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { message: 'Task ID is required' });
    }
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { memberIds } = body;
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return response(400, { message: 'memberIds array is required' });
    }
    
    // Get existing task using service
    const task = await getTaskById(taskId);
    
    if (!task) {
      return response(404, { message: 'Task not found' });
    }
    const existingMembers = task.assignedMembers || [];
    
    // Find new members (prevent duplicates)
    const newMembers = memberIds.filter(id => !existingMembers.includes(id));
    
    if (newMembers.length === 0) {
      return response(400, { message: 'All members are already assigned to this task' });
    }
    
    // Update task with new assignments using service
    const allMembers = [...new Set([...existingMembers, ...newMembers])];
    const updatedTask = await updateTask(taskId, { assignedMembers: allMembers });
    
    // Send email notifications to new members using service
    const emailPromises = newMembers.map(async (memberId) => {
      const email = await getUserEmail(memberId);
      if (email) {
        await sendTaskAssignmentEmail({ toEmail: email, task, assignerName: user.name });
      }
    });
    
    await Promise.all(emailPromises);
    
    console.log('Task assigned:', taskId, 'to members:', newMembers);
    
    return response(200, {
      message: 'Task assigned successfully',
      task: updatedTask,
      newlyAssigned: newMembers
    });
    
  } catch (error) {
    console.error('Error assigning task:', error);
    return response(500, { 
      message: 'Failed to assign task',
      error: error.message 
    });
  }
};
