#!/bin/bash
# Build script to bundle Lambda functions with shared services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LAMBDA_SRC="$PROJECT_ROOT/terraform/modules/lambda/src"
BACKEND_SRC="$PROJECT_ROOT/backend/src"
BUILD_DIR="$PROJECT_ROOT/terraform/modules/lambda/build"

echo "🚀 Building Lambda functions with shared services..."

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# List of Lambda functions
FUNCTIONS=(
  "create-task"
  "get-tasks"
  "get-task"
  "update-task"
  "delete-task"
  "assign-task"
  "update-status"
  "get-users"
  "post-confirmation"
)

# Build each function
for FUNC in "${FUNCTIONS[@]}"; do
  echo "📦 Building $FUNC..."
  
  FUNC_BUILD_DIR="$BUILD_DIR/$FUNC"
  mkdir -p "$FUNC_BUILD_DIR"
  
  # Copy handler
  cp "$LAMBDA_SRC/$FUNC/index.js" "$FUNC_BUILD_DIR/"
  
  # Copy shared services (create backend directory structure)
  mkdir -p "$FUNC_BUILD_DIR/backend/src"
  cp -r "$BACKEND_SRC/services" "$FUNC_BUILD_DIR/backend/src/"
  cp -r "$BACKEND_SRC/utils" "$FUNC_BUILD_DIR/backend/src/"
  
  # Install dependencies (if package.json exists)
  if [ -f "$BACKEND_SRC/../package.json" ]; then
    cp "$BACKEND_SRC/../package.json" "$FUNC_BUILD_DIR/"
    cd "$FUNC_BUILD_DIR"
    npm install --production --silent
    cd "$PROJECT_ROOT"
  fi
  
  echo "✅ $FUNC built successfully"
done

echo "🎉 All Lambda functions built successfully!"
echo "📁 Build output: $BUILD_DIR"
