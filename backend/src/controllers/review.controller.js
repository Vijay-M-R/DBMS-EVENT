import { ReviewService } from '../services/review.service.js';
import { CustomerService } from '../services/customer.service.js';
import { validateCreateReview } from '../validators/review.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class ReviewController {
  static async createReview(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateCreateReview(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const review = await ReviewService.createReview(profile.customer_id, body);
      return sendJson(res, 201, review, 'Review submitted successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getProviderReviews(req, res) {
    try {
      const providerId = parseInt(req.params.providerId, 10);
      const { page, limit } = req.query || {};
      const result = await ReviewService.getProviderReviews(
        providerId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 10
      );
      return sendJson(res, 200, result, 'Provider reviews retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
