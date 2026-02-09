// Update Task Status Lambda Handler
// Members can update status of tasks assigned to them
// Admins can update any task status
// Notifies admin and all assigned members on status change

const { success, error, getUserFromEvent, isAdmin, parseBody, getPathParam, isValidStatus, TASK_STATUSES } = require('/opt/nodejs/shared/utils/response');
const { getTaskById, updateTask } = require('/opt/nodejs/shared/services/dynamodb');
const { getUserEmail, listUsersInGroup } = require('/opt/nodejs/shared/services/cognito');
const { sendStatusUpdateEmail } = require('/opt/nodejs/shared/services/email');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401);
    }

    const taskId = getPathParam(event, 'id');
    if (!taskId) {
      return error('Task ID is required', 400);
    }

    const body = parseBody(event);
    const { status } = body;

    if (!status || !isValidStatus(status)) {
      return error('Valid status is required', 400, { validStatuses: TASK_STATUSES });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return error('Task not found', 404);
    }

    const oldStatus = task.status;

    // Authorization checks for non-admins
    if (!isAdmin(user)) {
      if (oldStatus === 'CLOSED') {
        return error('This task is closed and cannot be modified', 403);
      }
      if (!task.assignedMembers?.includes(user.userId)) {
        return error('You are not assigned to this task', 403);
      }
      if (status === 'CLOSED') {
        return error('Only admins can close tasks', 403);
      }
    }

    if (oldStatus === status) {
      return error('Task already has this status', 400);
    }

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

    // Collect all notification recipients
    const adminUsers = await listUsersInGroup('Admins');
    const adminIds = adminUsers.map(u => u.userId);

    const recipientIds = new Set([
      ...adminIds,
      ...(task.assignedMembers || []),
      task.createdBy
    ]);

    // Don't notify the user who made the update
    recipientIds.delete(user.userId);

    // Send email notifications
    const emailPromises = [...recipientIds].map(async (userId) => {
      const email = await getUserEmail(userId);
      if (email) {
        await sendStatusUpdateEmail({
          toEmail: email,
          task,
          oldStatus,
          newStatus: status,
          updaterName: user.name
        });
      }
    });

    await Promise.all(emailPromises);

    console.log('Task status updated:', taskId, 'from', oldStatus, 'to', status, 'Notified:', recipientIds.size, 'users');

    return success({
      message: 'Task status updated successfully',
      task: updatedTask,
      previousStatus: oldStatus
    });
  } catch (err) {
    console.error('Error updating task status:', err);
    return error('Failed to update task status', 500);
  }
};
