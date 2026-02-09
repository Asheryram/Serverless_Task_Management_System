// Common utilities for Lambda functions

const CORS_ORIGIN = process.env.CORS_ALLOWED_ORIGIN || '*';

/**
 * Standard API response helper
 */
const response = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE,PATCH',
    ...headers
  },
  body: JSON.stringify(body)
});

/**
 * Success response
 */
const success = (data, statusCode = 200) => response(statusCode, data);

/**
 * Error response
 */
const error = (message, statusCode = 500, details = null) => {
  const body = { message };
  if (details) body.details = details;
  return response(statusCode, body);
};

/**
 * Extract user info from Cognito JWT claims
 */
const getUserFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return null;

  const groupsClaim = claims['cognito:groups'];

  return {
    userId: claims.sub,
    email: claims.email,
    groups: Array.isArray(groupsClaim) ? groupsClaim : groupsClaim ? groupsClaim.split(',') : [],
    name: claims.name || claims.email,
    username: claims['cognito:username']
  };
};

/**
 * Check if user belongs to Admins group
 */
const isAdmin = (user) => {
  return user?.groups?.includes('Admins');
};

/**
 * Check if user belongs to Members group
 */
const isMember = (user) => {
  return user?.groups?.includes('Members');
};

/**
 * Validate required fields in request body
 */
const validateRequired = (body, fields) => {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  return { valid: true };
};

/**
 * Parse JSON body safely
 */
const parseBody = (event) => {
  try {
    return JSON.parse(event.body || '{}');
  } catch (e) {
    return {};
  }
};

/**
 * Get path parameter
 */
const getPathParam = (event, param) => {
  return event.pathParameters?.[param] || null;
};

/**
 * Get query parameter
 */
const getQueryParam = (event, param, defaultValue = null) => {
  return event.queryStringParameters?.[param] || defaultValue;
};

/**
 * Valid task statuses
 */
const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];

/**
 * Valid task priorities
 */
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Validate task status
 */
const isValidStatus = (status) => TASK_STATUSES.includes(status);

/**
 * Validate task priority
 */
const isValidPriority = (priority) => TASK_PRIORITIES.includes(priority);

module.exports = {
  response,
  success,
  error,
  getUserFromEvent,
  isAdmin,
  isMember,
  validateRequired,
  parseBody,
  getPathParam,
  getQueryParam,
  TASK_STATUSES,
  TASK_PRIORITIES,
  isValidStatus,
  isValidPriority
};
