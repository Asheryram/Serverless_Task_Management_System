// Get Users Lambda Handler
// Only admins can list users

const { CognitoIdentityProviderClient, ListUsersCommand, ListUsersInGroupCommand, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({});

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// Response helper
const response = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    ...headers
  },
  body: JSON.stringify(body)
});

// Extract user info from JWT claims
const getUserFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return null;
  
  return {
    userId: claims.sub,
    email: claims.email,
    groups: claims['cognito:groups'] ? claims['cognito:groups'].split(',') : [],
    name: claims.name || claims.email
  };
};

// Check if user is admin
const isAdmin = (user) => {
  return user?.groups?.includes('Admins');
};

// Parse Cognito user attributes
const parseUserAttributes = (attributes) => {
  const parsed = {};
  for (const attr of attributes || []) {
    parsed[attr.Name] = attr.Value;
  }
  return parsed;
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get user from token
    const user = getUserFromEvent(event);
    if (!user) {
      return response(401, { message: 'Unauthorized' });
    }
    
    // Only admins can list users
    if (!isAdmin(user)) {
      return response(403, { message: 'Only admins can list users' });
    }
    
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const group = queryParams.group; // 'Admins' or 'Members'
    
    let users = [];
    
    if (group) {
      // List users in specific group
      const result = await cognitoClient.send(new ListUsersInGroupCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        GroupName: group
      }));
      
      users = result.Users?.map(cognitoUser => {
        const attrs = parseUserAttributes(cognitoUser.Attributes);
        return {
          userId: attrs.sub,
          email: attrs.email,
          name: attrs.name || attrs.email,
          enabled: cognitoUser.Enabled,
          status: cognitoUser.UserStatus,
          createdAt: cognitoUser.UserCreateDate?.toISOString(),
          group: group
        };
      }) || [];
    } else {
      // List all users
      const result = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: COGNITO_USER_POOL_ID
      }));
      
      // Get groups for each user
      users = await Promise.all(result.Users?.map(async (cognitoUser) => {
        const attrs = parseUserAttributes(cognitoUser.Attributes);
        
        // Fetch user's groups
        let role = 'member'; // default
        try {
          const groupsResult = await cognitoClient.send(new AdminListGroupsForUserCommand({
            UserPoolId: COGNITO_USER_POOL_ID,
            Username: cognitoUser.Username
          }));
          const groups = groupsResult.Groups?.map(g => g.GroupName) || [];
          if (groups.includes('Admins')) {
            role = 'admin';
          } else if (groups.includes('Members')) {
            role = 'member';
          }
        } catch (err) {
          console.log('Error getting groups for user:', cognitoUser.Username, err);
        }
        
        return {
          userId: attrs.sub,
          email: attrs.email,
          name: attrs.name || attrs.email,
          enabled: cognitoUser.Enabled,
          status: cognitoUser.UserStatus,
          createdAt: cognitoUser.UserCreateDate?.toISOString(),
          role: role
        };
      }) || []);
    }
    
    // Filter out disabled/inactive users if needed
    const activeUsers = users.filter(u => u.enabled !== false);
    
    return response(200, {
      users: activeUsers,
      count: activeUsers.length
    });
    
  } catch (error) {
    console.error('Error getting users:', error);
    return response(500, { 
      message: 'Failed to retrieve users',
      error: error.message 
    });
  }
};
