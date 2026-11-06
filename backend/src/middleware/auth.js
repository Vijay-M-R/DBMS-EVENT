import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';

/**
 * Authentication Middleware for verifying Bearer JWT tokens.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return sendError(res, 401, 'Authentication token required');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return sendError(res, 401, 'Malformed authorization header. Expected: Bearer <token>');
  }

  const token = parts[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Authentication token has expired');
    }
    return sendError(res, 401, 'Invalid authentication token');
  }
};
