# Serverless Task Management System

A production-grade serverless task management application built on AWS, featuring role-based access control, email notifications, and a React frontend.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   Amplify    │     │   Cognito    │     │        API Gateway           │ │
│  │   (React)    │────▶│   (Auth)     │────▶│   (REST API + Authorizer)   │ │
│  └──────────────┘     └──────────────┘     └──────────────────────────────┘ │
│                                                         │                    │
│                                                         ▼                    │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │     SES      │◀────│   Lambda     │────▶│        DynamoDB              │ │
│  │   (Email)    │     │  Functions   │     │   (Tasks, Assignments)       │ │
│  └──────────────┘     └──────────────┘     └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📋 Features

### User Roles
- **Admin**: Create, update, assign, and close tasks
- **Member**: View assigned tasks and update task status

### Core Functionality
- Task CRUD operations (Admin only for create/delete)
- Task assignment to members
- Status updates with notifications
- Email notifications via AWS SES
- Role-based access control

### Security
- AWS Cognito authentication
- Email domain restrictions (@amalitech.com, @amalitechtraining.org)
- Email verification required
- API Gateway Cognito authorizers
- Scoped IAM roles per service

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React.js + AWS Amplify |
| API Layer | Amazon API Gateway |
| Business Logic | AWS Lambda (Node.js 18.x) |
| Database | Amazon DynamoDB |
| Authentication | Amazon Cognito |
| Notifications | Amazon SES |
| Infrastructure | Terraform |

## 📁 Project Structure

```
├── terraform/                  # Infrastructure as Code
│   ├── modules/               # Reusable Terraform modules
│   │   ├── cognito/          # Cognito User Pool
│   │   ├── dynamodb/         # DynamoDB Tables
│   │   ├── api-gateway/      # API Gateway
│   │   ├── lambda/           # Lambda Functions
│   │   └── ses/              # Simple Email Service
│   ├── environments/         # Environment-specific configs
│   │   ├── dev/
│   │   └── prod/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── backend/                   # Lambda function code
│   ├── src/
│   │   ├── handlers/         # Lambda handlers
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   └── middleware/       # Auth & validation
│   └── package.json
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom hooks
│   │   ├── context/          # React context
│   │   └── utils/            # Utilities
│   └── package.json
├── scripts/                   # Deployment scripts
└── docs/                      # Additional documentation
```

## 🚀 Getting Started

### Prerequisites
- AWS CLI configured with sandbox credentials
- Terraform >= 1.5.0
- Node.js >= 18.x
- npm >= 9.x

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Serverless_Task_Management_System
```

### 2. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Sandbox credentials
```

### 3. Deploy Infrastructure
```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

### 4. Deploy Backend
```bash
cd backend
npm install
npm run build
npm run deploy
```

### 5. Deploy Frontend
```bash
cd frontend
npm install
npm run build
# Push to Amplify-connected repository
```

## 📧 Email Domain Restrictions

Only the following email domains are allowed for signup:
- `@amalitech.com`
- `@amalitechtraining.org`

## 🔐 API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /tasks | Admin | Create a new task |
| GET | /tasks | All | Get all tasks (filtered by role) |
| GET | /tasks/{id} | All | Get task by ID |
| PUT | /tasks/{id} | All | Update task |
| DELETE | /tasks/{id} | Admin | Delete task |
| POST | /tasks/{id}/assign | Admin | Assign task to members |
| PUT | /tasks/{id}/status | All | Update task status |
| GET | /users | Admin | Get all users |

## 📊 DynamoDB Schema

### Tasks Table
| Attribute | Type | Description |
|-----------|------|-------------|
| taskId | String (PK) | Unique task identifier |
| title | String | Task title |
| description | String | Task description |
| status | String | OPEN, IN_PROGRESS, COMPLETED, CLOSED |
| priority | String | LOW, MEDIUM, HIGH |
| createdBy | String | Admin user ID |
| createdAt | String | ISO timestamp |
| updatedAt | String | ISO timestamp |
| dueDate | String | Task due date |
| assignedMembers | List | List of assigned user IDs |

### Users Table
| Attribute | Type | Description |
|-----------|------|-------------|
| userId | String (PK) | Cognito user sub |
| email | String (GSI) | User email |
| role | String | ADMIN or MEMBER |
| name | String | User full name |
| isActive | Boolean | Account status |
| createdAt | String | ISO timestamp |

## 🔔 Notifications

Email notifications are sent for:
1. **Task Assignment**: Member receives email when assigned to a task
2. **Status Update**: Admin and all assigned members notified on status change

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 Environment Variables

### Backend
```
AWS_REGION=us-east-1
TASKS_TABLE_NAME=tasks
USERS_TABLE_NAME=users
SES_FROM_EMAIL=noreply@yourdomain.com
```

### Frontend
```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_COGNITO_USER_POOL_ID=xxx
REACT_APP_COGNITO_CLIENT_ID=xxx
REACT_APP_COGNITO_REGION=us-east-1
```

## 👥 Contributors

AmaliTech Training Team

## 📄 License

This project is for educational purposes as part of AmaliTech training.

---
**Deadline**: February 20, 2026
