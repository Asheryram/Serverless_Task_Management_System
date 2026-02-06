// Cognito Service - User management operations

const { 
  CognitoIdentityProviderClient, 
  AdminGetUserCommand,
  ListUsersCommand,
  ListUsersInGroupCommand,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Parse Cognito user attributes to object
 */
const parseUserAttributes = (attributes) => {
  const parsed = {};
  for (const attr of attributes || []) {
    parsed[attr.Name] = attr.Value;
  }
  return parsed;
};

/**
 * Get user by username (sub/userId)
 */
const getUser = async (username) => {
  try {
    const result = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));
    
    const attrs = parseUserAttributes(result.UserAttributes);
    
    return {
      userId: attrs.sub,
      email: attrs.email,
      name: attrs.name || attrs.email,
      enabled: result.Enabled,
      status: result.UserStatus,
      createdAt: result.UserCreateDate?.toISOString()
    };
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      return null;
    }
    throw error;
  }
};

/**
 * Get user's email by userId
 */
const getUserEmail = async (userId) => {
  const user = await getUser(userId);
  return user?.email;
};

/**
 * List all users in the pool
 */
const listUsers = async (limit = 60) => {
  const result = await cognitoClient.send(new ListUsersCommand({
    UserPoolId: USER_POOL_ID,
    Limit: limit
  }));
  
  return result.Users?.map(user => {
    const attrs = parseUserAttributes(user.Attributes);
    return {
      userId: attrs.sub,
      email: attrs.email,
      name: attrs.name || attrs.email,
      enabled: user.Enabled,
      status: user.UserStatus,
      createdAt: user.UserCreateDate?.toISOString()
    };
  }) || [];
};

/**
 * List users in a specific group
 */
const listUsersInGroup = async (groupName, limit = 60) => {
  const result = await cognitoClient.send(new ListUsersInGroupCommand({
    UserPoolId: USER_POOL_ID,
    GroupName: groupName,
    Limit: limit
  }));
  
  return result.Users?.map(user => {
    const attrs = parseUserAttributes(user.Attributes);
    return {
      userId: attrs.sub,
      email: attrs.email,
      name: attrs.name || attrs.email,
      enabled: user.Enabled,
      status: user.UserStatus,
      createdAt: user.UserCreateDate?.toISOString(),
      group: groupName
    };
  }) || [];
};

/**
 * Get groups for a user
 */
const getUserGroups = async (username) => {
  const result = await cognitoClient.send(new AdminListGroupsForUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username
  }));
  
  return result.Groups?.map(g => g.GroupName) || [];
};

/**
 * Add user to a group
 */
const addUserToGroup = async (username, groupName) => {
  await cognitoClient.send(new AdminAddUserToGroupCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    GroupName: groupName
  }));
};

/**
 * Remove user from a group
 */
const removeUserFromGroup = async (username, groupName) => {
  await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    GroupName: groupName
  }));
};

/**
 * Disable a user
 */
const disableUser = async (username) => {
  await cognitoClient.send(new AdminDisableUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username
  }));
};

/**
 * Enable a user
 */
const enableUser = async (username) => {
  await cognitoClient.send(new AdminEnableUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username
  }));
};

/**
 * Check if user is active
 */
const isUserActive = async (userId) => {
  const user = await getUser(userId);
  return user?.enabled === true && user?.status === 'CONFIRMED';
};

/**
 * Get multiple users' emails
 */
const getUserEmails = async (userIds) => {
  const emails = {};
  
  await Promise.all(userIds.map(async (userId) => {
    const email = await getUserEmail(userId);
    if (email) {
      emails[userId] = email;
    }
  }));
  
  return emails;
};

module.exports = {
  getUser,
  getUserEmail,
  listUsers,
  listUsersInGroup,
  getUserGroups,
  addUserToGroup,
  removeUserFromGroup,
  disableUser,
  enableUser,
  isUserActive,
  getUserEmails
};
