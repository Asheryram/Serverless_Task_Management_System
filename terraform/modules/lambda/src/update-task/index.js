// Update Task Lambda Handler
// Admins can update any task, members cannot update tasks

const { success, error, getUserFromEvent, isAdmin, parseBody, getPathParam, isValidPriority } = require('/opt/nodejs/shared/utils/response');
const { getTaskById, updateTask, addTaskActivityLog } = require('/opt/nodejs/shared/services/dynamodb');

const ALLOWED_FIELDS = ['title', 'description', 'priority', 'dueDate', 'tags'];

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401, null, event);
    }

    if (!isAdmin(user)) {
      return error('Only admins can update task details', 403, null, event);
    }

    const taskId = getPathParam(event, 'id');
    if (!taskId) {
      return error('Task ID is required', 400, null, event);
    }

    const body = parseBody(event);

    const existing = await getTaskById(taskId);
    if (!existing) {
      return error('Task not found', 404, null, event);
    }

    if (body.priority && !isValidPriority(body.priority)) {
      return error('Invalid priority. Must be LOW, MEDIUM, HIGH, or URGENT', 400, null, event);
    }

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return error('No valid fields to update', 400, null, event);
    }

    // Track what changed for activity log
    const changes = {};
    for (const field of Object.keys(updates)) {
      if (existing[field] !== updates[field]) {
        changes[field] = {
          from: existing[field],
          to: updates[field]
        };
      }
    }

    const updatedTask = await updateTask(taskId, updates);

    // Add activity log if there were actual changes
    if (Object.keys(changes).length > 0) {
      try {
        await addTaskActivityLog(taskId, {
          action: 'TASK_UPDATED',
          userId: user.userId,
          userName: user.name,
          details: { changes }
        });
      } catch (logError) {
        console.error('Error adding activity log:', logError);
      }
    }

    console.log('Task updated:', taskId);

    return success({ message: 'Task updated successfully', task: updatedTask }, 200, event);
  } catch (err) {
    console.error('Error updating task:', err);
    return error('Failed to update task', 500, null, event);
  }
};
