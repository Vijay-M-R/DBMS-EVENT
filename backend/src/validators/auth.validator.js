/**
 * Authentication Input Validators
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export const validateRegister = (data) => {
  const errors = [];
  const { full_name, email, password, phone, role } = data || {};

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('full_name is required and must be at least 2 characters');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('password is required and must be at least 8 characters');
  }

  if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
    errors.push('A valid phone number (7-15 digits, optional +) is required');
  }

  if (!role || !['CUSTOMER', 'PROVIDER'].includes(role)) {
    errors.push('role is required and must be either CUSTOMER or PROVIDER');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateLogin = (data) => {
  const errors = [];
  const { email, password } = data || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('password is required');
  }

  return { isValid: errors.length === 0, errors };
};
