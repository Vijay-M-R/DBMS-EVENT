import { Router } from '../utils/router.js';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const customerRouter = new Router();

// Profile management
customerRouter.get('/profile', authenticate, authorize('CUSTOMER'), CustomerController.getProfile);
customerRouter.put('/profile', authenticate, authorize('CUSTOMER'), CustomerController.updateProfile);

// Address management
customerRouter.get('/addresses', authenticate, authorize('CUSTOMER'), CustomerController.getAddresses);
customerRouter.post('/addresses', authenticate, authorize('CUSTOMER'), CustomerController.addAddress);
customerRouter.patch('/addresses/:id/default', authenticate, authorize('CUSTOMER'), CustomerController.setDefaultAddress);
customerRouter.delete('/addresses/:id', authenticate, authorize('CUSTOMER'), CustomerController.deleteAddress);
