// Delete Task Lambda Handler
// Only admins can delete tasks

const { success, error, getUserFromEvent, isAdmin, getPathParam } = require('/opt/nodejs/shared/utils/response');
const { getTaskById, deleteTask } = require('/opt/nodejs/shared/services/dynamodb');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401, null, event);
    }

    if (!isAdmin(user)) {
      return error('Only admins can delete tasks', 403, null, event);
    }

    const taskId = getPathParam(event, 'id');
    if (!taskId) {
      return error('Task ID is required', 400, null, event);
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return error('Task not found', 404, null, event);
    }

    await deleteTask(taskId);

    console.log('Task deleted:', taskId);

    return success({ message: 'Task deleted successfully', taskId }, 200, event);
  } catch (err) {
    console.error('Error deleting task:', err);
    return error('Failed to delete task', 500, null, event);
  }
};
