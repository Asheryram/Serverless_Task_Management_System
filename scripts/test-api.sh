#!/bin/bash
# Quick API Test Script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Task Management API Test Suite"
echo "=================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Try to get API_URL from Terraform if not set
if [ -z "$API_URL" ]; then
    echo "${YELLOW}Fetching API URL from Terraform...${NC}"
    cd "$PROJECT_ROOT/terraform/environments/dev"
    API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
    cd "$SCRIPT_DIR"
fi

# Check if API_URL and TOKEN are set
if [ -z "$API_URL" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Error: API_URL and TOKEN must be set${NC}"
    echo ""
    echo "Usage:"
    echo "  export TOKEN='your-jwt-token'"
    echo "  ./test-api.sh"
    echo ""
    echo "Or set both:"
    echo "  export API_URL='https://your-api-url.amazonaws.com/dev'"
    echo "  export TOKEN='your-jwt-token'"
    echo "  ./test-api.sh"
    exit 1
fi

echo "API URL: $API_URL"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 1: Create Task
echo -e "${YELLOW}Test 1: Create Task${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task from Script",
    "description": "Testing Lambda Layer",
    "priority": "HIGH"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Task created (201)"
    TASK_ID=$(echo "$BODY" | grep -o '"taskId":"[^"]*' | cut -d'"' -f4)
    echo "   Task ID: $TASK_ID"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 201, got $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 2: Get All Tasks
echo -e "${YELLOW}Test 2: Get All Tasks${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Tasks retrieved (200)"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
fi
echo ""

# Test 3: Get Single Task
if [ ! -z "$TASK_ID" ]; then
    echo -e "${YELLOW}Test 3: Get Single Task${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/tasks/$TASK_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Task retrieved (200)"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
    fi
    echo ""
fi

# Test 4: Update Task
if [ ! -z "$TASK_ID" ]; then
    echo -e "${YELLOW}Test 4: Update Task${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/tasks/$TASK_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"title": "Updated Task Title", "priority": "MEDIUM"}')
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Task updated (200)"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
    fi
    echo ""
fi

# Test 5: Update Status
if [ ! -z "$TASK_ID" ]; then
    echo -e "${YELLOW}Test 5: Update Task Status${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/tasks/$TASK_ID/status" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "IN_PROGRESS"}')
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status updated (200)"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
    fi
    echo ""
fi

# Test 6: Get Users
echo -e "${YELLOW}Test 6: Get Users (Admin only)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/users" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Users retrieved (200)"
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC} - Not admin (403)"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 200 or 403, got $HTTP_CODE"
fi
echo ""

# Test 7: Delete Task
if [ ! -z "$TASK_ID" ]; then
    echo -e "${YELLOW}Test 7: Delete Task${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL/tasks/$TASK_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Task deleted (200)"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
    fi
    echo ""
fi

echo "=================================="
echo -e "${GREEN}🎉 Test suite completed!${NC}"
