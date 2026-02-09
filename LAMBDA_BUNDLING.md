# Lambda Bundling & Deployment Guide

## 🎯 The Problem

When you use `require()` in Node.js Lambda functions, the imported files **MUST be inside the zip file** that gets uploaded to AWS.

### ❌ What Was Happening Before

```
Terraform zips ONLY the handler folder:

create-task.zip:
└── index.js

But index.js tries to import:
require('../../../backend/src/services/dynamodb')

Result: ❌ "Cannot find module" error at runtime!
```

---

## ✅ The Solution

Bundle the shared services WITH each Lambda function before zipping.

### How It Works Now

```
1. Build Script Runs
   ↓
2. For each Lambda:
   - Copy index.js (handler)
   - Copy backend/src/services/
   - Copy backend/src/utils/
   - Install node_modules
   ↓
3. Terraform zips the bundled folder
   ↓
4. Upload to AWS Lambda
```

### What Gets Zipped

```
create-task.zip:
├── index.js                    ← Handler
├── backend/
│   └── src/
│       ├── services/           ← Shared services
│       │   ├── dynamodb.js
│       │   ├── cognito.js
│       │   └── email.js
│       └── utils/              ← Shared utilities
│           └── response.js
└── node_modules/               ← Dependencies
    ├── @aws-sdk/
    └── uuid/
```

---

## 🚀 How to Build & Deploy

### Step 1: Run Build Script

**On Windows:**
```cmd
cd scripts
build-lambdas.bat
```

**On Linux/Mac:**
```bash
cd scripts
chmod +x build-lambdas.sh
./build-lambdas.sh
```

This creates: `terraform/modules/lambda/build/` with bundled functions.

### Step 2: Update Terraform

Change `source_dir` to point to `build/` instead of `src/`:

```hcl
# Before
data "archive_file" "create_task" {
  source_dir = "${path.module}/src/create-task"
}

# After
data "archive_file" "create_task" {
  source_dir = "${path.module}/build/create-task"
}
```

### Step 3: Deploy

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

---

## 🔍 How Node.js Resolves Modules

When you call `require('module')`:

1. **Relative paths** (`./`, `../`): Look in the zip file
2. **Node modules** (`require('uuid')`): Look in `node_modules/`
3. **Lambda Layers**: Look in `/opt/nodejs/node_modules/`

**Example:**
```javascript
// In Lambda zip at: /var/task/index.js
require('./services/db')           // Looks in /var/task/services/db.js
require('uuid')                     // Looks in /var/task/node_modules/uuid/
require('../../../backend/src/services/db')  // Looks 3 folders up in the zip
```

---

## 📊 Bundle Size Comparison

| Approach | Size per Lambda | Total Size (9 functions) |
|----------|----------------|--------------------------|
| **Duplicated code** (old) | ~500 KB | ~4.5 MB |
| **Shared services** (new) | ~500 KB | ~4.5 MB |
| **Lambda Layer** (best) | ~50 KB | ~450 KB + 1 layer |

---

## ⚠️ Important Notes

1. **Always run build script before `terraform apply`**
2. **Zip file must contain ALL imported code**
3. **Node.js can't access files outside the zip**
4. **Max deployment package size: 50 MB (zipped), 250 MB (unzipped)**

---

## 📝 Summary

**When Terraform runs `archive_file`:**
- It zips everything in `source_dir`
- That zip gets uploaded to AWS Lambda
- Lambda extracts the zip to `/var/task/`
- Your handler runs from `/var/task/index.js`
- All `require()` statements must find files inside `/var/task/`

**That's why we need the build script:**
- It copies services into each Lambda folder
- So when Terraform zips it, services are included
- Lambda can then find the imported modules

**Think of it like packing a suitcase:**
- You can't use clothes from home once you're traveling
- You must pack everything you need in the suitcase
- The zip file IS the suitcase
- The build script does the packing
