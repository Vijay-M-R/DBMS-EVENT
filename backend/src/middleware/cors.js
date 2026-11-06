import { env } from '../config/environment.js';

/**
 * Native CORS Middleware
 */
export const handleCors = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', env.CORS.ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true; // Indicates request completed
  }
  return false;
};
