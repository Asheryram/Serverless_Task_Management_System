// Create Task Lambda Handler
// Only admins can create tasks

const crypto = require('crypto');
const { success, error, getUserFromEvent, isAdmin, parseBody, isValidPriority } = require('/opt/nodejs/shared/utils/response');
const { createTask } = require('/opt/nodejs/shared/services/dynamodb');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401, null, event);
    }

    if (!isAdmin(user)) {
      return error('Only admins can create tasks', 403, null, event);
    }

    const body = parseBody(event);

    if (!body.title) {
      return error('Task title is required', 400, null, event);
    }

    if (body.priority && !isValidPriority(body.priority)) {
      return error('Invalid priority. Must be LOW, MEDIUM, HIGH, or URGENT', 400, null, event);
    }

    const now = new Date().toISOString();
    const task = {
      taskId: crypto.randomUUID(),
      title: body.title,
      description: body.description || '',
      status: 'OPEN',
      priority: body.priority || 'MEDIUM',
      createdBy: user.userId,
      createdByEmail: user.email,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
      dueDate: body.dueDate || null,
      assignedMembers: [],
      tags: body.tags || []
    };

    await createTask(task);

    console.log('Task created:', task.taskId);

    return success({ message: 'Task created successfully', task }, 201, 200, event);
  } catch (err) {
    console.error('Error creating task:', err);
    return error('Failed to create task', 500, null, event);
  }
};
