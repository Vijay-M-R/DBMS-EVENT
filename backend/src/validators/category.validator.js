/**
 * Category Validators
 */

export const validateCreateCategory = (data) => {
  const errors = [];
  const { category_name, description, category_status } = data || {};

  if (!category_name || typeof category_name !== 'string' || category_name.trim().length < 2) {
    errors.push('category_name is required and must be at least 2 characters');
  }

  if (category_status && !['ACTIVE', 'INACTIVE'].includes(category_status)) {
    errors.push('category_status must be either ACTIVE or INACTIVE');
  }

  return { isValid: errors.length === 0, errors };
};
