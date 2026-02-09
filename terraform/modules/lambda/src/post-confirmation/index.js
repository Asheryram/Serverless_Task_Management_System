// Post Confirmation Lambda Handler (Cognito Trigger)
// Saves user to DynamoDB after email verification

const { createUser, getUserById } = require('shared/services/dynamodb');
const { addUserToGroup } = require('shared/services/cognito');

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
    
    // Check if user already exists using service
    const existing = await getUserById(userId);
    
    if (existing) {
      console.log('User already exists:', userId);
      return event;
    }
    
    // Create user record using service
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
    
    // Add user to Members group using service
    try {
      await addUserToGroup(userName, 'Members');
      console.log('User added to Members group');
    } catch (groupError) {
      console.error('Error adding user to group:', groupError);
    }
    
    return event;
    
  } catch (error) {
    console.error('Error in post confirmation:', error);
    // Don't fail the confirmation, just log the error
    return event;
  }
};
