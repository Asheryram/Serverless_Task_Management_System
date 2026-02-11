// Get Users Lambda Handler
// Only admins can list users

const { success, error, getUserFromEvent, isAdmin, getQueryParam } = require('/opt/nodejs/shared/utils/response');
const { listUsers, listUsersInGroup, getUserGroups } = require('/opt/nodejs/shared/services/cognito');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const user = getUserFromEvent(event);
    if (!user) {
      return error('Unauthorized', 401, null, event);
    }

    if (!isAdmin(user)) {
      return error('Only admins can list users', 403, null, event);
    }

    const group = getQueryParam(event, 'group');

    let users = [];

    if (group) {
      users = await listUsersInGroup(group);
    } else {
      const allUsers = await listUsers();

      users = await Promise.all(allUsers.map(async (cognitoUser) => {
        let role = 'member';
        try {
          const groups = await getUserGroups(cognitoUser.userId);
          if (groups.includes('Admins')) {
            role = 'admin';
          }
        } catch (err) {
          console.log('Error getting groups for user:', cognitoUser.userId, err);
        }

        return { ...cognitoUser, role };
      }));
    }

    const activeUsers = users.filter(u => u.enabled !== false);

    return success({
      users: activeUsers,
      count: activeUsers.length
    }, 200, event);
  } catch (err) {
    console.error('Error getting users:', err);
    return error('Failed to retrieve users', 500, null, event);
  }
};
