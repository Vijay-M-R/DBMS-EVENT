/**
 * Customer Address Validators
 */

export const validateCreateAddress = (data) => {
  const errors = [];
  const { address_line, city, state, pincode, landmark, address_type, is_default } = data || {};

  if (!address_line || typeof address_line !== 'string' || address_line.trim().length < 5) {
    errors.push('address_line is required and must be at least 5 characters');
  }

  if (!city || typeof city !== 'string' || city.trim().length < 2) {
    errors.push('city is required');
  }

  if (!state || typeof state !== 'string' || state.trim().length < 2) {
    errors.push('state is required');
  }

  if (!pincode || typeof pincode !== 'string' || pincode.trim().length < 4 || pincode.trim().length > 10) {
    errors.push('pincode is required and must be between 4 and 10 characters');
  }

  if (address_type && !['HOME', 'WORK', 'OTHER'].includes(address_type)) {
    errors.push('address_type must be HOME, WORK, or OTHER');
  }

  if (is_default !== undefined && typeof is_default !== 'boolean') {
    errors.push('is_default must be a boolean');
  }

  return { isValid: errors.length === 0, errors };
};
