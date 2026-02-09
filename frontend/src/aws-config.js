// AWS Amplify Configuration
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'eu-central-1_kGT5eTTVO',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '3372nmufgaj6ccns4pbiuo83un',
      loginWith: {
        oauth: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN || 'tms-dev-auth-ff1db3da.auth.eu-central-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [window.location.origin],
          redirectSignOut: [window.location.origin],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      TaskAPI: {
        endpoint: process.env.REACT_APP_API_URL || 'https://q60vvgkbq2.execute-api.eu-central-1.amazonaws.com/dev',
        region: process.env.REACT_APP_AWS_REGION || 'eu-central-1'
      }
    }
  }
};

export default awsConfig;
