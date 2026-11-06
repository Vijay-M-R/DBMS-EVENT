import { sendError } from '../utils/response.js';

/**
 * Role-Based Access Control (RBAC) Middleware Generator.
 * @param {...string} allowedRoles - 'CUSTOMER', 'PROVIDER', 'ADMIN'
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'User must be authenticated before authorization check');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`);
    }

    next();
  };
};
