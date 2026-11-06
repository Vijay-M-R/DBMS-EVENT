import { Router } from '../utils/router.js';
import { AvailabilityController } from '../controllers/availability.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const availabilityRouter = new Router();

// Public: View provider's available slots
availabilityRouter.get('/provider/:providerId', AvailabilityController.getAvailableSlots);

// Provider: Manage slots
availabilityRouter.get('/my-slots', authenticate, authorize('PROVIDER'), AvailabilityController.getProviderSlots);
availabilityRouter.post('/', authenticate, authorize('PROVIDER'), AvailabilityController.createSlot);
availabilityRouter.delete('/:id', authenticate, authorize('PROVIDER'), AvailabilityController.deleteSlot);
