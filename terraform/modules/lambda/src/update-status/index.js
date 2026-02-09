// Update Task Status Lambda Handler
// Members can update status of tasks assigned to them
// Admins can update any task status
// Notifies admin and all assigned members on status change

const { getTaskById, updateTask } = require('shared/services/dynamodb');
const { getUserEmail } = require('shared/services/cognito');
const { sendStatusUpdateEmail } = require('shared/services/email');
const { response, getUserFromEvent, isAdmin } = require('shared/utils/response');

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];



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
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { status } = body;
    
    if (!status || !VALID_STATUSES.includes(status)) {
      return response(400, { 
        message: 'Valid status is required',
        validStatuses: VALID_STATUSES 
      });
    }
    
    // Get existing task using service
    const task = await getTaskById(taskId);
    
    if (!task) {
      return response(404, { message: 'Task not found' });
    }
    const oldStatus = task.status;
    
    // Check authorization
    if (!isAdmin(user)) {
      // Members cannot modify closed tasks
      if (oldStatus === 'CLOSED') {
        return response(403, { message: 'This task is closed and cannot be modified' });
      }
      
      // Members can only update tasks assigned to them
      if (!task.assignedMembers?.includes(user.userId)) {
        return response(403, { message: 'You are not assigned to this task' });
      }
      
      // Members cannot close tasks
      if (status === 'CLOSED') {
        return response(403, { message: 'Only admins can close tasks' });
      }
    }
    
    // Don't update if status is the same
    if (oldStatus === status) {
      return response(400, { message: 'Task already has this status' });
    }
    
    // Update task status using service
    const updatedTask = await updateTask(taskId, {
      status,
      lastStatusUpdate: {
        from: oldStatus,
        to: status,
        updatedBy: user.userId,
        updatedByName: user.name,
        updatedAt: new Date().toISOString()
      }
    });
    
    // Collect recipient IDs (assigned members + task creator)
    const recipientIds = new Set([
      ...task.assignedMembers || [],
      task.createdBy
    ]);
    recipientIds.delete(user.userId); // Remove updater
    
    // Send email notifications using service
    const emailPromises = [...recipientIds].map(async (userId) => {
      const email = await getUserEmail(userId);
      if (email) {
        await sendStatusUpdateEmail({ toEmail: email, task, oldStatus, newStatus: status, updaterName: user.name });
      }
    });
    
    await Promise.all(emailPromises);
    
    console.log('Task status updated:', taskId, 'from', oldStatus, 'to', status, 'Notified:', recipientIds.size, 'users');
    
    return response(200, {
      message: 'Task status updated successfully',
      task: updatedTask,
      previousStatus: oldStatus
    });
    
  } catch (error) {
    console.error('Error updating task status:', error);
    return response(500, { 
      message: 'Failed to update task status',
      error: error.message 
    });
  }
};
