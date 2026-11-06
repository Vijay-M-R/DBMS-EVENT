import { Router } from '../utils/router.js';
import { ServiceController } from '../controllers/service.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const serviceRouter = new Router();

// Public: Search and view services
serviceRouter.get('/search', ServiceController.searchServices);
serviceRouter.get('/:id', ServiceController.getServiceById);

// Provider: Manage their service offerings
serviceRouter.get('/provider/my-services', authenticate, authorize('PROVIDER'), ServiceController.getProviderServices);
serviceRouter.post('/', authenticate, authorize('PROVIDER'), ServiceController.createService);
serviceRouter.put('/:id', authenticate, authorize('PROVIDER'), ServiceController.updateService);
serviceRouter.delete('/:id', authenticate, authorize('PROVIDER'), ServiceController.deleteService);
