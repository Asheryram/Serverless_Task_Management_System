# 🚀 SUPER SIMPLE - Run the App (3 Commands!)

## Prerequisites (One-time setup)

1. Install: AWS CLI, Terraform, Node.js
2. Run: `aws configure` (enter your AWS credentials)

---

## Deploy Everything (3 Steps)

### Step 1: Build Lambda Layer
```bash
cd scripts
./build-layer.sh
```

### Step 2: Deploy Infrastructure
```bash
cd ../terraform/environments/dev
terraform init
terraform apply
# Type 'yes' when prompted
```

### Step 3: Setup Email & Create Admin
```bash
cd ../../scripts

# Setup SES email
./setup-ses.sh
# Enter: yram.tetteh-abotsi@amalitech.com
# Check email and click verification link

# Create admin user
./create-admin.sh
# Enter email: admin@amalitech.com
# Enter name: Admin User
# Enter password: AdminPass123!
```

---

## Test It Works

```bash
# Get API URL
cd ../terraform/environments/dev
export API_URL=$(terraform output -raw api_url)

# Get auth token (you'll need to create get-token.js - see below)
cd ../../..
export TOKEN=$(node get-token.js)

# Test API
curl -X GET "$API_URL/tasks" -H "Authorization: Bearer $TOKEN"
```

**Create `get-token.js`:**
```javascript
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const client = new CognitoIdentityProviderClient({ region: 'eu-central-1' });

async function getToken() {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.CLIENT_ID, // Get from: terraform output -raw cognito_client_id
    AuthParameters: {
      USERNAME: 'admin@amalitech.com',
      PASSWORD: 'AdminPass123!'
    }
  });
  const response = await client.send(command);
  console.log(response.AuthenticationResult.IdToken);
}

getToken().catch(console.error);
```

---

## 🎉 Done!

Your app is running! Use the API URL from terraform output.

---

## All Available Scripts

```bash
scripts/
├── build-layer.sh         # Build Lambda Layer (REQUIRED)
├── deploy.sh              # Full deployment (alternative to manual terraform)
├── setup-ses.sh           # Setup email sending
├── create-admin.sh        # Create admin user
├── test-api.sh            # Test all endpoints
└── destroy.sh             # Delete everything
```

---

## Quick Commands

```bash
# Full automated deployment
cd scripts
./build-layer.sh && ./deploy.sh

# Create admin
./create-admin.sh

# Test API
export API_URL=$(cd ../terraform/environments/dev && terraform output -raw api_url)
export TOKEN="your-token"
./test-api.sh

# Clean up
./destroy.sh
```

---

## That's It!

Total time: ~15 minutes

For detailed docs, see:
- `QUICKSTART.md` - Step-by-step guide
- `TESTING_GUIDE.md` - Comprehensive testing
- `LAMBDA_LAYER_GUIDE.md` - Technical details
