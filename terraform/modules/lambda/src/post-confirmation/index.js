// Post Confirmation Lambda Handler (Cognito Trigger)
// Saves user to DynamoDB after email verification
//
// NOTE: This handler does NOT use the shared cognito.js service because
// COGNITO_USER_POOL_ID is not in its env vars (to avoid a Terraform circular
// dependency). Instead it reads userPoolId directly from the trigger event.

const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { createUser, getUserById } = require('/opt/nodejs/shared/services/dynamodb');

const cognitoClient = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { userName, userPoolId, request } = event;
    const { userAttributes } = request;

    // Only proceed for confirmed users
    if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
      console.log('Not a signup confirmation, skipping...');
      return event;
    }

    const userId = userAttributes.sub;
    const email = userAttributes.email;
    const name = userAttributes.name || email;

    // Check if user already exists
    const existing = await getUserById(userId);
    if (existing) {
      console.log('User already exists:', userId);
      return event;
    }

    // Create user record in DynamoDB
    const user = {
      userId,
      email,
      name,
      role: 'MEMBER',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    console.log('User created in DynamoDB:', userId);

    // Add user to Members group using userPoolId from the event
    try {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: userName,
        GroupName: 'Members'
      }));
      console.log('User added to Members group');
    } catch (groupError) {
      console.error('Error adding user to group:', groupError);
    }

    return event;
  } catch (err) {
    console.error('Error in post confirmation:', err);
    // Don't fail the confirmation, just log the error
    return event;
  }
};
