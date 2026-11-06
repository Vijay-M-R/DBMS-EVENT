import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';

/**
 * Generate a signed JWT token for an authenticated user.
 * @param {object} payload - { userId, role, email }
 * @returns {string}
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, env.AUTH.JWT_SECRET, {
    expiresIn: env.AUTH.JWT_EXPIRES_IN,
  });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.AUTH.JWT_SECRET);
};
