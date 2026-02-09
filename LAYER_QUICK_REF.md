# Lambda Layer - Quick Reference

## 🚀 Quick Deploy

```bash
# 1. Build layer
cd scripts
build-layer.bat          # Windows
# OR
./build-layer.sh         # Linux/Mac

# 2. Deploy
cd ../terraform/environments/dev
terraform apply
```

## 📁 Structure

```
Layer: /opt/nodejs/node_modules/shared/
├── services/
│   ├── dynamodb.js    → Database operations
│   ├── cognito.js     → User management
│   └── email.js       → Email notifications
└── utils/
    └── response.js    → HTTP response helpers

Lambda: /var/task/
└── index.js           → Handler only (5 KB)
```

## 💻 Import Pattern

```javascript
// All handlers use:
const { createTask } = require('shared/services/dynamodb');
const { getUserEmail } = require('shared/services/cognito');
const { sendEmail } = require('shared/services/email');
const { response, isAdmin } = require('shared/utils/response');
```

## 📊 Benefits

- **95% smaller** Lambda packages
- **Update once**, all functions benefit
- **Faster** cold starts
- **Easier** maintenance

## ✅ What's Done

- ✅ All 9 Lambda handlers updated
- ✅ Terraform configured with layer
- ✅ Build scripts created
- ✅ Import paths changed to `shared/`

## 🔄 To Update Services

1. Edit `backend/src/services/*.js`
2. Run `build-layer.bat`
3. Run `terraform apply`
4. Done! All functions updated.
