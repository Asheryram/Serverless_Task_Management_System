# Frontend Testing Guide

## Quick Setup (3 commands)

```bash
# 1. Generate .env file from Terraform
cd scripts
chmod +x setup-frontend.sh
./setup-frontend.sh

# 2. Install dependencies
cd ../frontend
npm install

# 3. Start development server
npm start
```

Frontend opens at `http://localhost:3000`

---

## Manual Setup

If you prefer to create `.env` manually:

```bash
cd frontend

# Get values from Terraform
cd ../terraform/environments/dev
terraform output

# Create .env file
cd ../../frontend
cat > .env << EOF
REACT_APP_API_URL=<paste api_url>
REACT_APP_USER_POOL_ID=<paste cognito_user_pool_id>
REACT_APP_CLIENT_ID=<paste cognito_client_id>
REACT_APP_COGNITO_DOMAIN=<paste cognito_domain>
REACT_APP_REGION=eu-central-1
EOF

# Install and run
npm install
npm start
```

---

## Login Credentials

Use the admin account you created:

```bash
Email: yram.tetteh-abotsi@amalitech.com (or your email)
Password: <password you set with create-admin.sh>
```

---

## Test Features

### As Admin:

1. **Login** - Use admin credentials
2. **View Dashboard** - See all tasks
3. **Create Task** - Click "New Task" button
4. **Assign Task** - Select task → Assign to member
5. **Update Status** - Change task status
6. **View Users** - See all users in system
7. **Delete Task** - Remove a task

### As Member:

1. **Create member user:**
   ```bash
   cd scripts
   ./create-admin.sh
   # Use different email
   # Manually change group to "Members" in AWS Console
   ```

2. **Login as member**
3. **View assigned tasks only**
4. **Update task status**
5. **Cannot create/delete tasks**

---

## Environment Variables

The frontend uses these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API endpoint | `https://xxx.execute-api.eu-central-1.amazonaws.com/dev` |
| `REACT_APP_USER_POOL_ID` | Cognito User Pool ID | `eu-central-1_xxxxxxxxx` |
| `REACT_APP_CLIENT_ID` | Cognito App Client ID | `xxxxxxxxxxxxxxxxxx` |
| `REACT_APP_COGNITO_DOMAIN` | Cognito domain | `tms-dev-auth-xxx.auth.eu-central-1.amazoncognito.com` |
| `REACT_APP_REGION` | AWS Region | `eu-central-1` |

---

## Troubleshooting

### "Network Error" when calling API

**Check:**
```bash
# Verify API URL is correct
echo $REACT_APP_API_URL

# Test API directly
curl -X GET "$REACT_APP_API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN"
```

**Fix:** Update `REACT_APP_API_URL` in `.env`

---

### "User does not exist" on login

**Check:**
```bash
# List users
aws cognito-idp list-users \
  --user-pool-id <your-pool-id> \
  --region eu-central-1
```

**Fix:** Create user with `./create-admin.sh`

---

### "Unauthorized" errors

**Check:**
- User is in correct Cognito group (Admins or Members)
- Token is valid (not expired)
- API Gateway has Cognito authorizer configured

**Fix:**
```bash
# Check user groups
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id <pool-id> \
  --username <email> \
  --region eu-central-1
```

---

### CORS errors

**Check:** `terraform/environments/dev/main.tf` has:
```hcl
cors_allowed_origins = [
  "http://localhost:3000",
  "https://localhost:3000"
]
```

**Fix:** Add your origin and run `terraform apply`

---

## Build for Production

```bash
cd frontend

# Build optimized production bundle
npm run build

# Output in build/ directory
ls -la build/

# Deploy to S3, Amplify, or any static host
```

---

## Available Scripts

```bash
npm start          # Start development server
npm test           # Run tests
npm run build      # Build for production
npm run eject      # Eject from Create React App (irreversible)
```

---

## Complete Testing Flow

```bash
# 1. Deploy backend
cd scripts
./build-layer.sh
cd ../terraform/environments/dev
terraform apply

# 2. Setup backend
cd ../../scripts
./setup-ses.sh
./create-admin.sh

# 3. Setup frontend
./setup-frontend.sh
cd ../frontend
npm install
npm start

# 4. Test in browser
# - Open http://localhost:3000
# - Login with admin credentials
# - Create tasks
# - Assign tasks
# - Update status
# - Check email notifications
```

---

## Next Steps

1. **Create member users** - Test member role
2. **Test email notifications** - Assign tasks and check emails
3. **Test all CRUD operations** - Create, read, update, delete
4. **Test role-based access** - Admin vs Member permissions
5. **Deploy to production** - Build and host on Amplify/S3

---

**Frontend is now configured to use environment variables!** 🎉

All hardcoded values have been replaced with `process.env.REACT_APP_*` variables.
