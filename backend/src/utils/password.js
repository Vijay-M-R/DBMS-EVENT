import bcrypt from 'bcrypt';
import { env } from '../config/environment.js';

/**
 * Hash a plain text password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, env.AUTH.BCRYPT_SALT_ROUNDS);
};

/**
 * Compare a plain text password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
