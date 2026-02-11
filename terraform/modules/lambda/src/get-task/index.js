// Get Single Task Lambda Handler
// Returns task details - admins see all, members see only assigned

const { success, error, getUserFromEvent, isAdmin, getPathParam } = require('/opt/nodejs/shared/utils/response');
const { getTaskById } = require('/opt/nodejs/shared/services/dynamodb');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401, null, event);
    }

    const taskId = getPathParam(event, 'id');
    if (!taskId) {
      return error('Task ID is required', 400, null, event);
    }

    const task = await getTaskById(taskId);

    if (!task) {
      return error('Task not found', 404, null, event);
    }

    if (!isAdmin(user)) {
      if (!task.assignedMembers?.includes(user.userId)) {
        return error('You are not assigned to this task', 403, null, event);
      }
    }

    return success({ task }, 200, event);
  } catch (err) {
    console.error('Error getting task:', err);
    return error('Failed to retrieve task', 500, null, event);
  }
};
