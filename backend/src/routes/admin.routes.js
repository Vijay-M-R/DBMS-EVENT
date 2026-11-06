import { Router } from '../utils/router.js';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const adminRouter = new Router();

// All admin routes strictly require ADMIN role
adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/dashboard', AdminController.getDashboardStats);
adminRouter.get('/customers', AdminController.getCustomers);
adminRouter.get('/providers', AdminController.getProviders);
adminRouter.patch('/providers/:id/verification', AdminController.updateProviderVerification);
adminRouter.patch('/users/:id/status', AdminController.updateUserStatus);
adminRouter.get('/bookings', AdminController.getAllBookings);
adminRouter.get('/logs', AdminController.getAuditLogs);
