import { Router } from '../utils/router.js';
import { ReviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const reviewRouter = new Router();

// Public: View reviews for a provider
reviewRouter.get('/provider/:providerId', ReviewController.getProviderReviews);

// Customer: Submit review for a completed booking
reviewRouter.post('/', authenticate, authorize('CUSTOMER'), ReviewController.createReview);
