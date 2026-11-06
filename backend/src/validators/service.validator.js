/**
 * Service Entity Validators
 */

export const validateCreateService = (data) => {
  const errors = [];
  const { category_id, service_name, description, price, estimated_duration } = data || {};

  if (!category_id || isNaN(parseInt(category_id, 10))) {
    errors.push('category_id is required and must be a valid integer ID');
  }

  if (!service_name || typeof service_name !== 'string' || service_name.trim().length < 3) {
    errors.push('service_name is required and must be at least 3 characters');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('description is required and must be at least 10 characters');
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    errors.push('price is required and must be a non-negative number');
  }

  const numDuration = parseInt(estimated_duration, 10);
  if (isNaN(numDuration) || numDuration <= 0) {
    errors.push('estimated_duration is required and must be a positive integer representing minutes');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateUpdateService = (data) => {
  const errors = [];
  const { category_id, service_name, description, price, estimated_duration, service_status } = data || {};

  if (category_id !== undefined && isNaN(parseInt(category_id, 10))) {
    errors.push('category_id must be a valid integer ID');
  }

  if (service_name !== undefined && (typeof service_name !== 'string' || service_name.trim().length < 3)) {
    errors.push('service_name must be at least 3 characters');
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length < 10)) {
    errors.push('description must be at least 10 characters');
  }

  if (price !== undefined) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      errors.push('price must be a non-negative number');
    }
  }

  if (estimated_duration !== undefined) {
    const numDuration = parseInt(estimated_duration, 10);
    if (isNaN(numDuration) || numDuration <= 0) {
      errors.push('estimated_duration must be a positive integer in minutes');
    }
  }

  if (service_status !== undefined && !['ACTIVE', 'INACTIVE'].includes(service_status)) {
    errors.push('service_status must be either ACTIVE or INACTIVE');
  }

  return { isValid: errors.length === 0, errors };
};
