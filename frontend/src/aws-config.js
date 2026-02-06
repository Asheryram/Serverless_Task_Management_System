// AWS Amplify Configuration
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'eu-central-1_kGT5eTTVO',
      userPoolClientId: '3372nmufgaj6ccns4pbiuo83un',
      loginWith: {
        oauth: {
          domain: 'tms-dev-auth-ff1db3da.auth.eu-central-1.amazoncognito.com',
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
        endpoint: 'https://q60vvgkbq2.execute-api.eu-central-1.amazonaws.com/dev',
        region: 'eu-central-1'
      }
    }
  }
};

export default awsConfig;
