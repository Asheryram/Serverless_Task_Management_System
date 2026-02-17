# Serverless Task Management System — In-Depth Codebase Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure](#2-project-structure)
3. [Lambda Functions (9 Total)](#3-lambda-functions-9-total)
4. [DynamoDB Tables & Data Models](#4-dynamodb-tables--data-models)
5. [AWS Cognito Authentication](#5-aws-cognito-authentication)
6. [API Gateway (REST API)](#6-api-gateway-rest-api)
7. [Notification System (SNS)](#7-notification-system-sns)
8. [Activity Logging](#8-activity-logging)
9. [IAM Roles & Permissions](#9-iam-roles--permissions)
10. [Lambda Layer (Shared Dependencies)](#10-lambda-layer-shared-dependencies)
11. [Frontend (React SPA)](#11-frontend-react-spa)
12. [Error Handling Patterns](#12-error-handling-patterns)
13. [Task Lifecycle & Workflows](#13-task-lifecycle--workflows)
14. [Data Flow Architecture](#14-data-flow-architecture)
15. [Environment Variables & Configuration](#15-environment-variables--configuration)
16. [Security Features](#16-security-features)
17. [Deployment Architecture](#17-deployment-architecture)
18. [Scalability & Performance](#18-scalability--performance)

---

## 1. Executive Summary

This is a **production-grade, fully serverless task management application** built on AWS infrastructure using **Terraform** for Infrastructure as Code. It features:

- **Role-based access control** (Admins vs Members) via Cognito groups
- **Email notifications** via SNS for task assignments and status updates
- **Comprehensive activity logging** for full audit trails
- **React SPA frontend** hosted on AWS Amplify with CI/CD
- **9 Lambda functions**, **3 DynamoDB tables**, **1 REST API**, **1 SNS topic**

The system allows admins to create, assign, and manage tasks while members can view their assigned tasks and update statuses. All changes are tracked and stakeholders are notified via email.

---

## 2. Project Structure

```
Serverless_Task_Management_System/
├── terraform/                          # Infrastructure as Code (Terraform)
│   ├── main.tf                        # Root orchestration module
│   ├── variables.tf                   # Global variables
│   ├── outputs.tf                     # Infrastructure outputs
│   ├── modules/
│   │   ├── cognito/                  # Cognito User Pool & Auth
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── dynamodb/                 # DynamoDB Tables
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── api-gateway/              # REST API
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── lambda/                   # Lambda Functions
│   │   │   ├── main.tf
│   │   │   ├── outputs.tf
│   │   │   └── src/                  # Lambda source code
│   │   │       ├── create-task/
│   │   │       ├── get-tasks/
│   │   │       ├── get-task/
│   │   │       ├── update-task/
│   │   │       ├── delete-task/
│   │   │       ├── assign-task/
│   │   │       ├── update-status/
│   │   │       ├── get-users/
│   │   │       └── post-confirmation/
│   │   ├── sns/                      # SNS Topic
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── amplify/                  # Frontend Hosting
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   └── environments/dev/             # Dev environment config
│       ├── main.tf
│       └── terraform.tfvars
├── backend/                           # Lambda Layer Source Code
│   ├── src/
│   │   ├── services/                 # Shared business logic
│   │   │   ├── cognito.js            # Cognito operations
│   │   │   ├── dynamodb.js           # DynamoDB operations
│   │   │   ├── sns.js                # SNS notifications
│   │   │   └── email.js              # Email service
│   │   └── utils/
│   │       └── response.js           # HTTP response helpers
│   └── package.json
├── frontend/                         # React SPA
│   ├── src/
│   │   ├── components/Layout/        # Header, Sidebar
│   │   ├── pages/                    # Login, Dashboard, Tasks, etc.
│   │   ├── context/AuthContext.js     # Global auth state
│   │   ├── services/api.js           # Axios API client
│   │   ├── App.js
│   │   └── aws-config.js
│   └── package.json
├── scripts/                          # Build & deployment scripts
│   ├── build.js
│   ├── deploy.sh / deploy.bat
│   ├── destroy.sh
│   └── create-admin.sh
├── docs/                             # Documentation & diagrams
└── README.md
```

---

## 3. Lambda Functions (9 Total)

### 3.1 `create-task` — Create a New Task

| Property | Value |
|----------|-------|
| **Route** | `POST /tasks` |
| **Access** | Admin only |
| **Source** | `terraform/modules/lambda/src/create-task/index.js` |

**What it does:**
1. Extracts the user from the Cognito JWT claims in the API Gateway event.
2. Validates the user is an admin (checks `cognito:groups` for "Admins").
3. Validates the request body — `title` is required; `priority` must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
4. Generates a UUID for `taskId`.
5. Writes the task to DynamoDB with `status = "OPEN"`, the creator's info, and timestamps.
6. Appends an activity log entry with action `TASK_CREATED`.
7. Returns `201` with the created task object.

**Key fields stored:**
```json
{
  "taskId": "uuid",
  "title": "string (required)",
  "description": "string",
  "status": "OPEN",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "dueDate": "ISO date string",
  "tags": ["array of strings"],
  "createdBy": "cognito-sub",
  "createdByEmail": "admin@domain.com",
  "createdByName": "Admin Name",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "assignedMembers": [],
  "activityLog": []
}
```

---

### 3.2 `get-tasks` — Retrieve All Tasks (Role-Filtered)

| Property | Value |
|----------|-------|
| **Route** | `GET /tasks` |
| **Access** | All authenticated users |
| **Source** | `terraform/modules/lambda/src/get-tasks/index.js` |

**What it does:**
1. Extracts the user and checks their role.
2. **Admins** see all tasks. If a `status` query parameter is provided, it queries using the `StatusIndex` GSI. Otherwise, it scans the full table.
3. **Members** see only tasks where their `userId` is in the `assignedMembers` array. The function scans all tasks and filters client-side.
4. Supports optional query parameters: `status` (filter by task status) and `limit` (max results).
5. Results are sorted by `updatedAt` in descending order (most recent first).

---

### 3.3 `get-task` — Retrieve a Single Task

| Property | Value |
|----------|-------|
| **Route** | `GET /tasks/{id}` |
| **Access** | All authenticated users (with authorization check) |
| **Source** | `terraform/modules/lambda/src/get-task/index.js` |

**What it does:**
1. Extracts `taskId` from the URL path parameter.
2. Fetches the task from DynamoDB by primary key.
3. Returns `404` if the task doesn't exist.
4. **Admins** can view any task.
5. **Members** can only view tasks where they are in `assignedMembers` — returns `403` otherwise.
6. Returns the full task object including the activity log.

---

### 3.4 `update-task` — Update Task Details

| Property | Value |
|----------|-------|
| **Route** | `PUT /tasks/{id}` |
| **Access** | Admin only |
| **Source** | `terraform/modules/lambda/src/update-task/index.js` |

**What it does:**
1. Validates the user is an admin.
2. Fetches the current task from DynamoDB.
3. Only allows updating whitelisted fields: `title`, `description`, `priority`, `dueDate`, `tags`.
4. **Tracks changes**: For each field being modified, it records the old value (`from`) and new value (`to`).
5. Updates the task in DynamoDB with the new values and a fresh `updatedAt` timestamp.
6. Appends an activity log entry with action `TASK_UPDATED` containing the detailed changes object.
7. Returns the updated task.

**Example change tracking:**
```json
{
  "action": "TASK_UPDATED",
  "details": {
    "changes": {
      "priority": { "from": "LOW", "to": "HIGH" },
      "title": { "from": "Old Title", "to": "New Title" }
    }
  }
}
```

---

### 3.5 `delete-task` — Delete a Task

| Property | Value |
|----------|-------|
| **Route** | `DELETE /tasks/{id}` |
| **Access** | Admin only |
| **Source** | `terraform/modules/lambda/src/delete-task/index.js` |

**What it does:**
1. Validates the user is an admin.
2. Checks the task exists (returns `404` if not).
3. Deletes the task from DynamoDB.
4. Returns `200` with the deleted `taskId`.

---

### 3.6 `assign-task` — Assign Members to a Task

| Property | Value |
|----------|-------|
| **Route** | `POST /tasks/{id}/assign` |
| **Access** | Admin only |
| **Source** | `terraform/modules/lambda/src/assign-task/index.js` |

**What it does:**
1. Validates the user is an admin.
2. Validates the request body contains a `memberIds` array.
3. Fetches the current task to get existing `assignedMembers`.
4. **Deduplicates**: Filters out members who are already assigned, keeping only new additions.
5. Updates the task with the union of existing + new members.
6. Appends an activity log entry with action `MEMBERS_ASSIGNED`.
7. **Sends email notifications** to each newly assigned member:
   - Looks up each member's email from Cognito.
   - Publishes to the SNS topic with `MessageAttributes` to target specific recipients.
   - Uses `Promise.allSettled()` so notification failures don't crash the response.
8. Returns the count of newly assigned and notified members.

---

### 3.7 `update-status` — Update Task Status

| Property | Value |
|----------|-------|
| **Route** | `PUT /tasks/{id}/status` |
| **Access** | All authenticated users (with rules) |
| **Source** | `terraform/modules/lambda/src/update-status/index.js` |

**What it does:**

This is the most complex Lambda function because it handles both authorization logic and multi-recipient notifications.

**Authorization rules for Members:**
- Cannot update a task that is already `CLOSED`.
- Must be in the task's `assignedMembers` list.
- Cannot set status to `CLOSED` (only admins can close tasks).
- Can transition: `OPEN` → `IN_PROGRESS`, `IN_PROGRESS` → `COMPLETED`.

**Authorization rules for Admins:**
- Can set any valid status on any task.

**Process:**
1. Validates the new `status` is in the allowed enum: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`.
2. Skips the update if the status hasn't actually changed.
3. Updates the task with the new status and a `lastStatusUpdate` object:
   ```json
   {
     "from": "OPEN",
     "to": "IN_PROGRESS",
     "updatedBy": "user-id",
     "updatedByName": "User Name",
     "updatedAt": "ISO timestamp"
   }
   ```
4. Appends activity log: `STATUS_CHANGED`.
5. **Collects notification recipients:**
   - All users in the "Admins" Cognito group.
   - All users in the task's `assignedMembers`.
   - The task creator (`createdBy`).
   - **Excludes** the user who made the update (don't notify yourself).
6. Sends individual SNS notifications to each recipient using `Promise.allSettled()`.
7. Returns the updated task and notification count.

---

### 3.8 `get-users` — List Users

| Property | Value |
|----------|-------|
| **Route** | `GET /users` |
| **Access** | Admin only |
| **Source** | `terraform/modules/lambda/src/get-users/index.js` |

**What it does:**
1. Validates the user is an admin.
2. If `group` query parameter is provided (e.g., `?group=Members`), lists users in that specific Cognito group.
3. Otherwise, lists all users in the Cognito user pool.
4. Enriches each user with their group memberships.
5. Filters to only return active users (`enabled !== false`).
6. Returns the user list with roles and group info.

---

### 3.9 `post-confirmation` — Cognito Post-Confirmation Trigger

| Property | Value |
|----------|-------|
| **Trigger** | Cognito `PostConfirmation_ConfirmSignUp` event |
| **Source** | `terraform/modules/lambda/src/post-confirmation/index.js` |

**What it does (automatically after a user confirms their email):**
1. Checks the trigger source is `PostConfirmation_ConfirmSignUp` (ignores other triggers).
2. Extracts `userId` (sub), `email`, and `name` from the Cognito event.
3. Checks if the user already exists in DynamoDB (idempotency).
4. Creates a user record in the Users DynamoDB table:
   ```json
   {
     "userId": "cognito-sub",
     "email": "user@domain.com",
     "name": "User Name",
     "role": "MEMBER",
     "isActive": true,
     "createdAt": "ISO timestamp"
   }
   ```
5. Adds the user to the "Members" Cognito group using the Admin API.
6. Subscribes the user's email to the SNS topic with a filter policy so they only receive notifications addressed to them:
   ```json
   { "email": ["user@domain.com"] }
   ```
7. All errors are caught and logged but **never fail the signup** — the function always returns the event to Cognito.

---

## 4. DynamoDB Tables & Data Models

### 4.1 Tasks Table (`tms-{env}-tasks-{suffix}`)

**Billing Mode**: PAY_PER_REQUEST (auto-scaling, no capacity planning needed)
**Encryption**: Server-side enabled

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `taskId` | String | **Partition Key** | UUID primary key |
| `title` | String | — | Task title (required) |
| `description` | String | — | Task description |
| `status` | String | GSI Partition Key | `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CLOSED` |
| `priority` | String | — | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `createdBy` | String | GSI Partition Key | Admin user ID who created the task |
| `createdByEmail` | String | — | Creator's email |
| `createdByName` | String | — | Creator's display name |
| `createdAt` | String | GSI Sort Key | ISO 8601 timestamp |
| `updatedAt` | String | — | ISO 8601 timestamp |
| `dueDate` | String | — | Optional due date |
| `assignedMembers` | List | — | Array of userId strings |
| `tags` | List | — | Array of tag strings |
| `lastStatusUpdate` | Map | — | `{ from, to, updatedBy, updatedByName, updatedAt }` |
| `activityLog` | List | — | Array of activity log entries |
| `ttl` | Number | — | Optional TTL for auto-archival |

**Global Secondary Indexes:**
1. **StatusIndex** — Partition: `status`, Sort: `createdAt` — Efficiently query tasks by status.
2. **CreatedByIndex** — Partition: `createdBy`, Sort: `createdAt` — Query tasks created by a specific admin.

---

### 4.2 Users Table (`tms-{env}-users-{suffix}`)

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `userId` | String | **Partition Key** | Cognito `sub` |
| `email` | String | GSI Partition Key | User email (unique) |
| `name` | String | — | Full name |
| `role` | String | GSI Partition Key | `ADMIN` or `MEMBER` |
| `isActive` | Boolean | — | Account active status |
| `createdAt` | String | — | ISO timestamp |
| `updatedAt` | String | — | ISO timestamp |

**Global Secondary Indexes:**
1. **EmailIndex** — Partition: `email` — Lookup by email address.
2. **RoleIndex** — Partition: `role` — List all users by role.

---

### 4.3 Task Assignments Table (`tms-{env}-task-assignments-{suffix}`)

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `taskId` | String | **Partition Key** | Task identifier |
| `userId` | String | **Sort Key** | User identifier |
| `assignedAt` | String | — | Assignment timestamp |
| `assignedBy` | String | — | Admin who assigned |
| `status` | String | — | Assignment status |

**Global Secondary Indexes:**
1. **UserAssignmentsIndex** — Partition: `userId`, Sort: `taskId` — Query all tasks assigned to a user.

---

## 5. AWS Cognito Authentication

### User Pool Configuration
- **Username attribute**: Email (case-insensitive)
- **Email verification**: Required and auto-verified
- **Password policy**: 8+ characters, uppercase, lowercase, numbers, symbols
- **MFA**: Off (can be enabled)
- **Account recovery**: Via verified email

### Pre-Signup Lambda Trigger (Domain Validation)
When a user signs up, a Lambda validates their email domain:
- **Allowed domains**: `amalitech.com`, `amalitechtraining.org`
- If the domain is not in the whitelist, the signup is **rejected**.

### Post-Confirmation Lambda Trigger
After email verification, the `post-confirmation` Lambda:
- Creates the user record in DynamoDB
- Adds the user to the "Members" Cognito group
- Subscribes the user to the SNS notification topic

### User Groups
| Group | Permissions |
|-------|------------|
| **Admins** | Full CRUD on tasks, assign members, close tasks, view all users |
| **Members** | View assigned tasks, update status (except CLOSED) |

### OAuth2 / App Client
- **Scopes**: `email`, `openid`, `profile`
- **Auth flow**: Authorization Code with PKCE
- **Callback URLs**: Configurable (e.g., `http://localhost:3000/callback`)
- **Hosted UI domain**: `{prefix}-auth-{suffix}.auth.{region}.amazoncognito.com`

---

## 6. API Gateway (REST API)

### Endpoints

| Method | Endpoint | Lambda | Access | Description |
|--------|----------|--------|--------|-------------|
| `POST` | `/tasks` | create-task | Admin | Create a new task |
| `GET` | `/tasks` | get-tasks | All | List tasks (role-filtered) |
| `GET` | `/tasks/{id}` | get-task | All | Get single task |
| `PUT` | `/tasks/{id}` | update-task | Admin | Update task details |
| `DELETE` | `/tasks/{id}` | delete-task | Admin | Delete a task |
| `POST` | `/tasks/{id}/assign` | assign-task | Admin | Assign members |
| `PUT` | `/tasks/{id}/status` | update-status | All | Update task status |
| `GET` | `/users` | get-users | Admin | List all users |
| `OPTIONS` | `/*` | MOCK | Public | CORS preflight |

### Authentication
- **Authorizer type**: `COGNITO_USER_POOLS`
- **Identity source**: `Authorization` header (Bearer token)
- Every request (except OPTIONS) requires a valid Cognito JWT
- The JWT claims (`sub`, `email`, `name`, `cognito:groups`) are passed to Lambda in `event.requestContext.authorizer.claims`

### CORS Configuration
- **Origins**: Configurable via Terraform variable `cors_allowed_origins`
- **Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Headers**: `Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token`

### Integration Type
- All endpoints use **AWS_PROXY** (Lambda proxy integration)
- The full HTTP request is passed to the Lambda as the `event` object
- Lambdas return `{ statusCode, headers, body }` directly

---

## 7. Notification System (SNS)

### Architecture
A single SNS topic (`{project}-task-notifications`) handles all email notifications. Each user is subscribed with a **filter policy** on their email address, ensuring they only receive notifications meant for them.

### Notification Flows

#### 7.1 Task Assignment Notification
- **Triggered by**: `assign-task` Lambda
- **Recipients**: Newly assigned members only
- **Content**: Task title, description, priority, due date, who assigned it
- **Method**: Individual SNS `Publish` with `MessageAttributes.email = "member@domain.com"`

#### 7.2 Status Update Notification
- **Triggered by**: `update-status` Lambda
- **Recipients**: All admins + all assigned members + task creator (excluding the updater)
- **Content**: Task title, old status, new status, who updated it
- **Method**: Individual SNS `Publish` per recipient

### How Per-Recipient Filtering Works
1. When a user signs up, the `post-confirmation` Lambda subscribes their email to the SNS topic with filter policy: `{ "email": ["user@domain.com"] }`.
2. When a Lambda sends a notification, it includes `MessageAttributes.email = "target@domain.com"`.
3. SNS matches the attribute against each subscription's filter policy and only delivers to the matching subscriber.
4. This ensures each user gets only notifications addressed to them.

### Resilience
- All notification sends use `Promise.allSettled()` — if one email fails, the others still send.
- Notification failures are logged but **never cause the API response to fail**.
- The API response includes the count of successfully notified recipients.

---

## 8. Activity Logging

### Storage
Activity logs are stored as an array (`activityLog`) within each task document in DynamoDB. New entries are appended atomically using DynamoDB's `list_append` expression.

### Activity Log Entry Structure
```json
{
  "id": "1700000000000-abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "TASK_CREATED",
  "userId": "cognito-sub-id",
  "userName": "John Admin",
  "details": { ... }
}
```

### Tracked Actions

| Action | Trigger | Details |
|--------|---------|---------|
| `TASK_CREATED` | `create-task` | `{ title, priority }` |
| `TASK_UPDATED` | `update-task` | `{ changes: { field: { from, to } } }` |
| `MEMBERS_ASSIGNED` | `assign-task` | `{ assignedMemberIds: [], totalMembers: N }` |
| `STATUS_CHANGED` | `update-status` | `{ from: "OPEN", to: "IN_PROGRESS" }` |

### How It Works
The shared `dynamodb.js` service provides an `addTaskActivityLog(taskId, logEntry)` function that:
1. Constructs the log entry with a unique ID, timestamp, and action details.
2. Uses `UpdateCommand` with `SET activityLog = list_append(activityLog, :newEntry)`.
3. This is an atomic append operation — safe for concurrent updates.

---

## 9. IAM Roles & Permissions

### Lambda Execution Role (`tms-{env}-lambda-role-{suffix}`)

The single IAM role shared by all Lambda functions has four policy attachments:

**Policy 1 — CloudWatch Logs:**
```
Actions: logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
Resources: arn:aws:logs:*:*:*
```

**Policy 2 — DynamoDB (Tasks, Users, Assignments tables + all indexes):**
```
Actions: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan, BatchGetItem, BatchWriteItem
Resources: All three table ARNs + their index ARNs
```

**Policy 3 — SNS:**
```
Actions: sns:Publish, sns:Subscribe, sns:SetSubscriptionAttributes
Resources: SNS topic ARN
```

**Policy 4 — Cognito:**
```
Actions: AdminGetUser, ListUsers, ListUsersInGroup, AdminListGroupsForUser,
         AdminAddUserToGroup, AdminRemoveUserFromGroup
Resources: *
```

### Pre-Signup Lambda Role
- Minimal role with only CloudWatch Logs permissions.
- The pre-signup function only validates email domains — no AWS service calls needed.

---

## 10. Lambda Layer (Shared Dependencies)

### Purpose
All 9 Lambda functions share common code (AWS SDK clients, business logic, utilities) through a Lambda Layer, avoiding code duplication and reducing deployment package sizes.

### Layer Contents
```
/opt/nodejs/
├── node_modules/
│   ├── @aws-sdk/client-dynamodb
│   ├── @aws-sdk/client-cognito-identity-provider
│   ├── @aws-sdk/client-sns
│   ├── @aws-sdk/lib-dynamodb
│   └── uuid
└── shared/
    ├── services/
    │   ├── cognito.js    — Cognito admin operations
    │   ├── dynamodb.js   — DynamoDB CRUD operations
    │   └── sns.js        — SNS notification sending
    └── utils/
        └── response.js   — HTTP response builders & auth helpers
```

### Key Service Files

#### `dynamodb.js` — DynamoDB Operations
- `createTask(task)` — PutItem to tasks table
- `getTaskById(taskId)` — GetItem by partition key
- `getAllTasks()` — Scan tasks table
- `getTasksByStatus(status)` — Query StatusIndex GSI
- `updateTask(taskId, updates)` — UpdateItem with expression builder
- `deleteTask(taskId)` — DeleteItem
- `addTaskActivityLog(taskId, logEntry)` — Atomic list_append
- `createUser(user)` — PutItem to users table
- `getUserById(userId)` — GetItem from users table

#### `cognito.js` — Cognito Operations
- `listUsers()` — List all users in the pool
- `listUsersInGroup(groupName)` — List users in a specific group
- `getUserEmail(userId)` — Get a user's email by their sub
- `getUser(userId)` — Get full user details
- `getUserGroups(userId)` — Get a user's group memberships
- `addUserToGroup(userId, groupName)` — Add user to a Cognito group

#### `sns.js` — SNS Notifications
- `sendTaskAssignmentEmail(toEmail, taskDetails, assignerName)` — Assignment notification
- `sendStatusUpdateEmail(toEmail, taskTitle, oldStatus, newStatus, updaterName)` — Status change notification

#### `response.js` — HTTP Response Utilities
- `success(data, statusCode, event)` — Returns `{ statusCode, headers (CORS), body }`
- `error(message, statusCode, errors, event)` — Returns error response with CORS headers
- `getUserFromEvent(event)` — Extracts user info from Cognito JWT claims
- `isAdmin(user)` — Checks if user's groups include "Admins"

### Build Process
The `scripts/build.js` script:
1. Cleans the `build/` directory.
2. Runs `npm install --production` for the layer dependencies.
3. Copies `backend/src/services/` and `backend/src/utils/` into the layer structure.
4. The output at `build/layer/nodejs/` is zipped and deployed as a Lambda Layer by Terraform.

---

## 11. Frontend (React SPA)

### Technology Stack
- **React 18** with functional components and hooks
- **React Router v6** for client-side routing
- **AWS Amplify Auth** for Cognito integration
- **Axios** for HTTP requests with JWT interceptors
- **React Context API** for global state management
- **react-icons** for UI icons
- **CSS3** with custom styles

### Authentication Context (`AuthContext.js`)
Provides a `useAuth()` hook with:
- `user` — Current authenticated user object
- `isAdmin` — Boolean: true if user is in "Admins" group
- `login(email, password)` — Sign in via Cognito
- `register(email, password, name)` — Sign up
- `confirmRegistration(email, code)` — Confirm email with verification code
- `completeNewPassword(newPassword)` — Handle forced password change
- `logout()` — Sign out
- `getToken()` — Retrieve current JWT for API calls
- `refreshUser()` — Reload user data from Cognito

### API Service (`api.js`)
An Axios instance configured with:
- **Base URL**: `REACT_APP_API_URL` (API Gateway endpoint)
- **Request interceptor**: Automatically attaches `Authorization: Bearer <token>` to every request
- **Response interceptor**: Redirects to `/login` on 401 responses

**Exported methods:**
```javascript
// Task operations
taskApi.getAll(params)                    // GET /tasks
taskApi.getById(taskId)                   // GET /tasks/{id}
taskApi.create(taskData)                  // POST /tasks
taskApi.update(taskId, data)              // PUT /tasks/{id}
taskApi.delete(taskId)                    // DELETE /tasks/{id}
taskApi.assign(taskId, memberIds)         // POST /tasks/{id}/assign
taskApi.updateStatus(taskId, status)      // PUT /tasks/{id}/status

// User operations
userApi.getAll(params)                    // GET /users
userApi.getByGroup(group)                 // GET /users?group=...
userApi.getMembers()                      // GET /users?group=Members
```

### Pages

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | Login, registration, email confirmation, new password flow |
| **Dashboard** | `/` | Task statistics overview, recent activity |
| **Tasks** | `/tasks` | Task list with filters, create/assign/delete modals (admin) |
| **TaskDetail** | `/tasks/:id` | Full task view, status updates, activity log timeline |
| **Users** | `/users` | User management (admin only) |
| **Profile** | `/profile` | User profile, preferences, password change |

### Protected Routes
- A `ProtectedRoute` wrapper component checks authentication.
- Routes with `adminOnly` prop additionally verify the user is an admin.
- Unauthenticated users are redirected to `/login`.

---

## 12. Error Handling Patterns

### Lambda Error Handling
Every Lambda function follows this pattern:
```javascript
try {
  // 1. Extract user from event
  // 2. Validate authorization
  // 3. Validate input
  // 4. Execute business logic
  // 5. Return success response
  return success(data, statusCode, event);
} catch (err) {
  console.error('Error:', err);
  return error('User-friendly message', 500, null, event);
}
```

### HTTP Status Codes Used
| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success | Task updated, deleted, status changed |
| `201` | Created | Task created |
| `400` | Bad Request | Missing required field, invalid enum value |
| `401` | Unauthorized | No user in JWT claims |
| `403` | Forbidden | Member trying admin action, member not assigned |
| `404` | Not Found | Task doesn't exist |
| `500` | Server Error | Unexpected DynamoDB or Cognito failure |

### Non-Blocking Error Handling
For secondary operations (notifications, activity logging), errors are caught and logged but don't fail the primary operation:
```javascript
// Notifications use Promise.allSettled()
const results = await Promise.allSettled(
  recipients.map(r => sendNotification(r))
);
const notified = results.filter(r => r.status === 'fulfilled').length;
```

### Frontend Error Handling
- **API errors**: Caught by Axios response interceptor; 401 triggers redirect to login.
- **Auth errors**: Caught in AuthContext and re-thrown for page-level handling.
- **UI feedback**: Uses `toast.success()` and `toast.error()` for user notifications.

---

## 13. Task Lifecycle & Workflows

### Complete Task Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│  1. ADMIN CREATES TASK                                      │
│     POST /tasks → status: OPEN                              │
│     Activity: TASK_CREATED                                  │
├─────────────────────────────────────────────────────────────┤
│  2. ADMIN ASSIGNS MEMBERS                                   │
│     POST /tasks/{id}/assign                                 │
│     Activity: MEMBERS_ASSIGNED                              │
│     Notification: Email to each new assignee                │
├─────────────────────────────────────────────────────────────┤
│  3. MEMBER STARTS WORK                                      │
│     PUT /tasks/{id}/status → IN_PROGRESS                    │
│     Activity: STATUS_CHANGED (OPEN → IN_PROGRESS)           │
│     Notification: Email to admins + other assignees + creator│
├─────────────────────────────────────────────────────────────┤
│  4. ADMIN UPDATES DETAILS (optional)                        │
│     PUT /tasks/{id} → updated fields                        │
│     Activity: TASK_UPDATED with change tracking             │
├─────────────────────────────────────────────────────────────┤
│  5. MEMBER COMPLETES TASK                                   │
│     PUT /tasks/{id}/status → COMPLETED                      │
│     Activity: STATUS_CHANGED (IN_PROGRESS → COMPLETED)      │
│     Notification: Email to admins + other assignees + creator│
├─────────────────────────────────────────────────────────────┤
│  6. ADMIN CLOSES TASK                                       │
│     PUT /tasks/{id}/status → CLOSED                         │
│     Activity: STATUS_CHANGED (COMPLETED → CLOSED)           │
│     Notification: Email to assigned members + creator       │
└─────────────────────────────────────────────────────────────┘
```

### Status Transitions

```
OPEN ──→ IN_PROGRESS ──→ COMPLETED ──→ CLOSED
  ↑          │               │
  └──────────┘               │
  (Admin can revert)    (Admin can revert)
```

- **Members** can only move forward: `OPEN → IN_PROGRESS → COMPLETED`
- **Admins** can set any status including `CLOSED`
- **Closed tasks** cannot be modified by members

### Role-Based Access Control Summary

| Operation | Admin | Member |
|-----------|:-----:|:------:|
| Create task | Yes | No |
| View all tasks | Yes | No |
| View assigned tasks | Yes | Yes |
| Update task details | Yes | No |
| Delete task | Yes | No |
| Assign members | Yes | No |
| Update status (OPEN/IN_PROGRESS/COMPLETED) | Yes | Yes* |
| Set status to CLOSED | Yes | No |
| View all users | Yes | No |
| View activity log | Yes | Yes |

*Members can only update status on tasks assigned to them.

---

## 14. Data Flow Architecture

### Task Creation Flow
```
Browser → POST /tasks (JWT) → API Gateway → Cognito Authorizer → create-task Lambda
                                                                       │
                                            ┌──────────────────────────┤
                                            │                          │
                                    Validate Admin            Validate Body
                                            │                          │
                                            └──────────┬───────────────┘
                                                       │
                                              DynamoDB PutItem (task)
                                                       │
                                              DynamoDB UpdateItem (activity log)
                                                       │
                                              Return 201 + task → Browser
```

### Task Assignment & Notification Flow
```
Browser → POST /tasks/{id}/assign (JWT) → API Gateway → assign-task Lambda
                                                              │
                                                   ┌──────────┤
                                                   │          │
                                           Get Task      Filter New Members
                                                   │          │
                                                   └────┬─────┘
                                                        │
                                               Update assignedMembers
                                                        │
                                               Log: MEMBERS_ASSIGNED
                                                        │
                                          ┌─────────────┼─────────────┐
                                          │             │             │
                                    Cognito:       Cognito:      Cognito:
                                    Get Email1     Get Email2    Get EmailN
                                          │             │             │
                                    SNS Publish    SNS Publish   SNS Publish
                                    (email1)       (email2)      (emailN)
                                          │             │             │
                                          └─────────────┼─────────────┘
                                                        │
                                               Return 200 + count
```

### Status Update & Notification Flow
```
Browser → PUT /tasks/{id}/status (JWT) → API Gateway → update-status Lambda
                                                              │
                                                   ┌──────────┤
                                                   │          │
                                           Get Task      Validate Authorization
                                                   │          │
                                                   └────┬─────┘
                                                        │
                                               Update task.status + lastStatusUpdate
                                                        │
                                               Log: STATUS_CHANGED
                                                        │
                                          Collect Recipients:
                                          ├─ All Admins (from Cognito)
                                          ├─ All assignedMembers
                                          ├─ Task creator
                                          └─ Remove self (updater)
                                                        │
                                          Send individual SNS emails
                                          (Promise.allSettled)
                                                        │
                                               Return 200 + task + notified count
```

---

## 15. Environment Variables & Configuration

### Lambda Environment Variables (set by Terraform)
```
NODE_ENV                              = dev
AWS_NODEJS_CONNECTION_REUSE_ENABLED   = 1
TASKS_TABLE_NAME                      = tms-dev-tasks-{suffix}
USERS_TABLE_NAME                      = tms-dev-users-{suffix}
TASK_ASSIGNMENTS_TABLE_NAME           = tms-dev-task-assignments-{suffix}
SNS_TOPIC_ARN                         = arn:aws:sns:{region}:{account}:{topic}
COGNITO_USER_POOL_ID                  = {region}_{poolId}
AWS_REGION_NAME                       = us-east-1
CORS_ALLOWED_ORIGINS                  = http://localhost:3000,https://yourdomain.com
```

### Frontend Environment Variables (`.env` file)
```
REACT_APP_API_URL                     = https://xxxxx.execute-api.{region}.amazonaws.com/dev
REACT_APP_COGNITO_USER_POOL_ID       = {region}_{poolId}
REACT_APP_COGNITO_CLIENT_ID          = {clientId}
REACT_APP_COGNITO_DOMAIN             = tms-dev-auth-xxxxx.auth.{region}.amazoncognito.com
REACT_APP_AWS_REGION                  = us-east-1
```

### Terraform Variables (`terraform.tfvars`)
```hcl
aws_region              = "us-east-1"
environment             = "dev"
allowed_email_domains   = ["amalitech.com", "amalitechtraining.org"]
cognito_callback_urls   = ["http://localhost:3000/callback"]
cognito_logout_urls     = ["http://localhost:3000/logout"]
notification_emails     = ["admin@amalitech.com"]
cors_allowed_origins    = ["http://localhost:3000"]
frontend_repository_url = "https://github.com/user/repo"
github_access_token     = "ghp_xxxx"
frontend_branch_name    = "main"
```

---

## 16. Security Features

### Authentication & Authorization
1. **Cognito JWT tokens** required for all API endpoints
2. **Email domain whitelist** at signup (only `@amalitech.com`, `@amalitechtraining.org`)
3. **Email verification** required before account activation
4. **Group-based RBAC** enforced at Lambda level (not just API Gateway)
5. **Password policy**: 8+ chars with uppercase, lowercase, numbers, and symbols

### API Security
1. **HTTPS only**: API Gateway enforces TLS
2. **CORS**: Restricted to configured origins
3. **API Gateway throttling**: Default rate limiting protects against abuse
4. **Input validation**: All Lambdas validate and whitelist allowed fields

### Data Security
1. **DynamoDB encryption**: Server-side encryption enabled
2. **Point-in-Time Recovery**: Enabled for production
3. **Least privilege IAM**: Lambda role limited to specific tables and operations
4. **No hardcoded secrets**: All configuration via environment variables and Terraform

### Notification Security
1. **SNS filter policies**: Prevent users from receiving others' notifications
2. **Topic policy**: Only Lambda service principal can publish

---

## 17. Deployment Architecture

### Terraform Module Dependency Graph
```
root main.tf
  ├──→ module.cognito         (no dependencies)
  ├──→ module.dynamodb        (no dependencies)
  ├──→ module.sns             (no dependencies)
  ├──→ module.lambda          (depends on: cognito, dynamodb, sns)
  │    ├─ Builds Lambda layer from backend/src
  │    ├─ Creates 9 Lambda functions
  │    ├─ Creates IAM role + policies
  │    └─ Wires Cognito triggers
  ├──→ module.api_gateway     (depends on: lambda, cognito)
  │    ├─ Creates REST API
  │    ├─ Creates Cognito authorizer
  │    ├─ Creates routes + Lambda integrations
  │    └─ Deploys to stage
  └──→ module.amplify         (independent)
       ├─ Creates Amplify app
       ├─ Connects GitHub repository
       └─ Auto-deploys on push
```

### Deployment Steps
```bash
# 1. Build Lambda layer
node scripts/build.js

# 2. Initialize Terraform
cd terraform/environments/dev
terraform init

# 3. Preview changes
terraform plan

# 4. Deploy infrastructure
terraform apply

# 5. Frontend auto-deploys via Amplify CI/CD on git push
```

---

## 18. Scalability & Performance

### Lambda
- **Scaling**: Automatic, on-demand (AWS manages concurrency)
- **Memory**: 256MB default (configurable up to 10GB)
- **Timeout**: 30 seconds
- **Connection reuse**: `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1` for HTTP keep-alive

### DynamoDB
- **Billing**: PAY_PER_REQUEST (auto-scales to any traffic level)
- **Partition keys**: Well-distributed UUIDs and Cognito subs
- **GSIs**: StatusIndex and CreatedByIndex for efficient queries without full scans
- **Batch operations**: `BatchGetItem` used where applicable

### API Gateway
- **Type**: Regional endpoint (low latency)
- **Throttling**: 10,000 requests/second default
- **Caching**: Optional CloudFront integration available

### Frontend
- **CDN**: Amplify serves via CloudFront for global distribution
- **Build**: Minified production React build
- **Caching**: Browser caches static assets

### Key Optimizations
1. Lambda Layer avoids repackaging shared dependencies with each function
2. `Promise.allSettled()` for parallel notification sends
3. GSIs eliminate full table scans for status-based queries
4. Connection reuse reduces Lambda cold start overhead
5. Pay-per-request billing eliminates over/under-provisioning

---

## Summary

This Serverless Task Management System is a complete, production-ready application comprising:

- **9 Lambda functions** handling all business logic
- **3 DynamoDB tables** with 6 Global Secondary Indexes
- **1 Cognito User Pool** with 2 groups, domain validation, and OAuth2
- **1 REST API** with 8 authenticated endpoints
- **1 SNS topic** for per-recipient email notifications
- **1 React SPA** with role-based UI and Amplify hosting
- **Full Terraform IaC** for reproducible deployments
- **Activity logging** for complete audit trails
- **Role-based access control** enforced at every layer
