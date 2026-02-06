// Post Confirmation Lambda Handler (Cognito Trigger)
// Saves user to DynamoDB after email verification

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({});

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

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
    const existing = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    
    if (existing.Item) {
      console.log('User already exists:', userId);
      return event;
    }
    
    // Determine role - default to MEMBER
    // Admins need to be manually added to Admin group
    const role = 'MEMBER';
    
    // Create user record in DynamoDB
    const user = {
      userId,
      email,
      name,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: user
    }));
    
    console.log('User created in DynamoDB:', userId);
    
    // Add user to Members group by default
    try {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: userName,
        GroupName: 'Members'
      }));
      console.log('User added to Members group');
    } catch (groupError) {
      console.error('Error adding user to group:', groupError);
      // Don't fail the signup if group assignment fails
    }
    
    return event;
    
  } catch (error) {
    console.error('Error in post confirmation:', error);
    // Don't fail the confirmation, just log the error
    return event;
  }
};
