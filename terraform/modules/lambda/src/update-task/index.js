// Update Task Lambda Handler
// Admins can update any task, members cannot update tasks

const { success, error, getUserFromEvent, isAdmin, parseBody, getPathParam, isValidPriority } = require('/opt/nodejs/shared/utils/response');
const { getTaskById, updateTask } = require('/opt/nodejs/shared/services/dynamodb');

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

    const updatedTask = await updateTask(taskId, updates);

    console.log('Task updated:', taskId);

    return success({ message: 'Task updated successfully', task: updatedTask }, 200, event);
  } catch (err) {
    console.error('Error updating task:', err);
    return error('Failed to update task', 500, null, event);
  }
};
