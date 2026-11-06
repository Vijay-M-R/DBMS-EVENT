/**
 * Review Validators
 */

export const validateCreateReview = (data) => {
  const errors = [];
  const { booking_id, rating, comment } = data || {};

  if (!booking_id || isNaN(parseInt(booking_id, 10))) {
    errors.push('booking_id is required and must be an integer');
  }

  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    errors.push('rating is required and must be an integer between 1 and 5');
  }

  if (comment !== undefined && typeof comment !== 'string') {
    errors.push('comment must be a string');
  }

  return { isValid: errors.length === 0, errors };
};
