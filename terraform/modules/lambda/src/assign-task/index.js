// Assign Task Lambda Handler
// Only admins can assign tasks to members
// Sends email notification to assigned members

const { success, error, getUserFromEvent, isAdmin, parseBody, getPathParam } = require('/opt/nodejs/shared/utils/response');
const { getTaskById, updateTask } = require('/opt/nodejs/shared/services/dynamodb');
const { getUserEmail } = require('/opt/nodejs/shared/services/cognito');
const { sendTaskAssignmentEmail } = require('/opt/nodejs/shared/services/sns');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401, null, event);
    }

    if (!isAdmin(user)) {
      return error('Only admins can assign tasks', 403, null, event);
    }

    const taskId = getPathParam(event, 'id');
    if (!taskId) {
      return error('Task ID is required', 400, null, event);
    }

    const body = parseBody(event);
    const { memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return error('memberIds array is required', 400, null, event);
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return error('Task not found', 404, null, event);
    }

    const existingMembers = task.assignedMembers || [];
    const newMembers = memberIds.filter(id => !existingMembers.includes(id));

    if (newMembers.length === 0) {
      return error('All members are already assigned to this task', 400, null, event);
    }

    const allMembers = [...new Set([...existingMembers, ...newMembers])];

    const updatedTask = await updateTask(taskId, { assignedMembers: allMembers });

    // Send email notifications to new members
    const emailPromises = newMembers.map(async (memberId) => {
      const email = await getUserEmail(memberId);
      if (email) {
        await sendTaskAssignmentEmail({ toEmail: email, task, assignerName: user.name });
      }
    });

    await Promise.all(emailPromises);

    console.log('Task assigned:', taskId, 'to members:', newMembers);

    return success({
      message: 'Task assigned successfully',
      task: updatedTask,
      newlyAssigned: newMembers
    }, 200, event);
  } catch (err) {
    console.error('Error assigning task:', err);
    return error('Failed to assign task', 500, null, event);
  }
};
