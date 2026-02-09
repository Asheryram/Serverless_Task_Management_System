#!/bin/bash
# Build Lambda Layer with shared services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_SRC="$PROJECT_ROOT/backend/src"
LAYER_DIR="$PROJECT_ROOT/terraform/modules/lambda/layer/nodejs/node_modules/shared"

echo "🚀 Building Lambda Layer..."

# Clean and create layer directory
rm -rf "$PROJECT_ROOT/terraform/modules/lambda/layer"
mkdir -p "$LAYER_DIR"

# Copy services
cp -r "$BACKEND_SRC/services" "$LAYER_DIR/"
echo "✅ Services copied"

# Copy utils
cp -r "$BACKEND_SRC/utils" "$LAYER_DIR/"
echo "✅ Utils copied"

# Create package.json for layer
cat > "$PROJECT_ROOT/terraform/modules/lambda/layer/nodejs/package.json" << 'EOF'
{
  "name": "shared-services-layer",
  "version": "1.0.0",
  "description": "Shared services for Lambda functions",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-ses": "^3.400.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.400.0",
    "uuid": "^9.0.0"
  }
}
EOF

echo "🎉 Layer structure created successfully!"
echo "📁 Location: $LAYER_DIR"
