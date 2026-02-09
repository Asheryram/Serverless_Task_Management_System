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
      return error('Unauthorized', 401);
    }

    if (!isAdmin(user)) {
      return error('Only admins can update task details', 403);
    }

    const taskId = getPathParam(event, 'id');
    if (!taskId) {
      return error('Task ID is required', 400);
    }

    const body = parseBody(event);

    const existing = await getTaskById(taskId);
    if (!existing) {
      return error('Task not found', 404);
    }

    if (body.priority && !isValidPriority(body.priority)) {
      return error('Invalid priority. Must be LOW, MEDIUM, HIGH, or URGENT', 400);
    }

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return error('No valid fields to update', 400);
    }

    const updatedTask = await updateTask(taskId, updates);

    console.log('Task updated:', taskId);

    return success({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    console.error('Error updating task:', err);
    return error('Failed to update task', 500);
  }
};
