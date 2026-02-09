// AWS Amplify Configuration
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID ,
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID ,
      loginWith: {
        oauth: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN ,
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
        endpoint: process.env.REACT_APP_API_URL ,
        region: process.env.REACT_APP_AWS_REGION 
      }
    }
  }
};

export default awsConfig;
