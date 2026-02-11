const fs = require('fs');
const path = require('path');

const lambdaDir = path.join(__dirname, '..', 'terraform', 'modules', 'lambda', 'src');

const handlers = [
  'get-users', 'create-task', 'update-status', 'assign-task', 
  'delete-task', 'get-task', 'update-task'
];

handlers.forEach(handler => {
  const filePath = path.join(lambdaDir, handler, 'index.js');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace error calls - handle different patterns
  content = content.replace(/return error\('([^']+)', (\d+), \{ validStatuses: TASK_STATUSES \}\);/g, 
    "return error('$1', $2, { validStatuses: TASK_STATUSES }, event);");
  
  content = content.replace(/return error\('([^']+)', (\d+), ([^)]+)\);/g, 
    "return error('$1', $2, $3, event);");
  
  content = content.replace(/return error\('([^']+)', (\d+)\);/g, 
    "return error('$1', $2, null, event);");
  
  content = content.replace(/return error\('([^']+)'\);/g, 
    "return error('$1', 500, null, event);");
  
  // Replace success calls
  content = content.replace(/return success\(([^,]+), (\d+)\);/g, 
    'return success($1, $2, event);');
  
  content = content.replace(/return success\(([^)]+)\);/g, 
    'return success($1, 200, event);');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${handler}`);
});

console.log('All handlers updated!');
