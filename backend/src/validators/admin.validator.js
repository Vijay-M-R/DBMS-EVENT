/**
 * Admin Action Validators
 * Enforces valid statuses and required administrative reasons for sensitive actions.
 */

const VALID_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];
const VALID_ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
const VALID_SERVICE_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Validate Provider Verification Status Update
 */
export const validateProviderVerification = (data) => {
  const errors = [];
  const { verification_status, reason } = data || {};

  if (!verification_status || typeof verification_status !== 'string') {
    errors.push('verification_status is required and must be a string');
  } else if (!VALID_VERIFICATION_STATUSES.includes(verification_status)) {
    errors.push(`verification_status must be one of: ${VALID_VERIFICATION_STATUSES.join(', ')}`);
  }

  // Administrative reason is required when rejecting or suspending a provider
  if (['REJECTED', 'SUSPENDED'].includes(verification_status)) {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      errors.push(`A reason of at least 3 characters is required when setting verification status to ${verification_status}`);
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate User Account Status Update
 */
export const validateUserStatus = (data) => {
  const errors = [];
  const { account_status, reason } = data || {};

  if (!account_status || typeof account_status !== 'string') {
    errors.push('account_status is required and must be a string');
  } else if (!VALID_ACCOUNT_STATUSES.includes(account_status)) {
    errors.push(`account_status must be one of: ${VALID_ACCOUNT_STATUSES.join(', ')}`);
  }

  // Administrative reason is required when suspending or deactivating an account
  if (['SUSPENDED', 'DEACTIVATED'].includes(account_status)) {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      errors.push(`A reason of at least 3 characters is required when setting account status to ${account_status}`);
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate Service Status Update (Admin Moderation)
 */
export const validateServiceStatus = (data) => {
  const errors = [];
  const { service_status, reason } = data || {};

  if (!service_status || typeof service_status !== 'string') {
    errors.push('service_status is required and must be a string');
  } else if (!VALID_SERVICE_STATUSES.includes(service_status)) {
    errors.push(`service_status must be one of: ${VALID_SERVICE_STATUSES.join(', ')}`);
  }

  // Administrative reason is required when deactivating/suspending a service
  if (service_status === 'INACTIVE') {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      errors.push('A reason of at least 3 characters is required when deactivating a service');
    }
  }

  return { isValid: errors.length === 0, errors };
};
