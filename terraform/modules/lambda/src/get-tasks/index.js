// Get Tasks Lambda Handler
// Returns all tasks for admins, only assigned tasks for members

const { success, error, getUserFromEvent, isAdmin, getQueryParam } = require('/opt/nodejs/shared/utils/response');
const { getAllTasks, getTasksByStatus, getTasksForUser } = require('/opt/nodejs/shared/services/dynamodb');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401);
    }

    const status = getQueryParam(event, 'status');
    const limit = parseInt(getQueryParam(event, 'limit', '50'));

    let tasks;

    if (isAdmin(user)) {
      if (status) {
        tasks = await getTasksByStatus(status, limit);
      } else {
        tasks = await getAllTasks(limit);
      }
    } else {
      tasks = await getTasksForUser(user.userId, limit);

      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }
    }

    tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return success({
      tasks,
      count: tasks.length,
      isAdmin: isAdmin(user)
    });
  } catch (err) {
    console.error('Error getting tasks:', err);
    return error('Failed to retrieve tasks', 500);
  }
};
