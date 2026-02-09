# Complete Deployment - Command Reference

## Quick Commands (Copy & Paste)

### 1. Before Terraform
```bash
cd scripts
./build-layer.sh
```

### 2. Deploy with Terraform (You do this)
```bash
cd ../terraform/environments/dev
terraform init
terraform apply
```

### 3. After Terraform
```bash
cd ../../scripts

# Setup email
./setup-ses.sh
# Enter: yram.tetteh-abotsi@amalitech.com
# Check email and verify

# Create admin
./create-admin.sh
# Enter email, name, password

# Get token
./get-token.sh
# Enter email and password
# Copy the token

# Export token
export TOKEN="paste-your-token"

# Test API (automatically fetches API_URL)
./test-api.sh
```

---

## All Scripts Auto-Fetch Terraform Outputs

✅ **create-admin.sh** - Fetches USER_POOL_ID  
✅ **get-token.sh** - Fetches CLIENT_ID  
✅ **test-api.sh** - Fetches API_URL  

No manual exports needed!

---

## One-Line Commands

```bash
# Complete setup after terraform
cd scripts && ./setup-ses.sh && ./create-admin.sh && ./get-token.sh

# Test (after exporting TOKEN)
export TOKEN="your-token" && ./test-api.sh
```

---

## Update Services

```bash
cd scripts
./build-layer.sh
cd ../terraform/environments/dev
terraform apply
```

---

## Verify Deployment

```bash
# Check Lambda has layer
aws lambda get-function --function-name task-mgmt-create-task-dev --query 'Configuration.Layers'

# Check logs (no errors)
aws logs tail /aws/lambda/task-mgmt-create-task-dev --follow

# Check email verified
aws ses get-identity-verification-attributes --identities yram.tetteh-abotsi@amalitech.com --region eu-central-1
```

---

## That's It!

All scripts are smart - they fetch what they need from Terraform automatically.
