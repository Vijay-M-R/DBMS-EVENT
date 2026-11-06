import { Router } from '../utils/router.js';
import { ProviderController } from '../controllers/provider.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const providerRouter = new Router();

// Public provider discovery
providerRouter.get('/search', ProviderController.searchProviders);
providerRouter.get('/:id/public', ProviderController.getPublicProfile);

// Authenticated provider profile management
providerRouter.get('/profile', authenticate, authorize('PROVIDER'), ProviderController.getProfile);
providerRouter.put('/profile', authenticate, authorize('PROVIDER'), ProviderController.updateProfile);
