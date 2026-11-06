import { Router } from '../utils/router.js';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const adminRouter = new Router();

// All admin routes strictly require authentication and ADMIN role
adminRouter.use(authenticate);
adminRouter.use(authorize('ADMIN'));

// Platform Dashboard
adminRouter.get('/dashboard', AdminController.getDashboardStats);

// Customer Management
adminRouter.get('/customers', AdminController.getCustomers);
adminRouter.get('/customers/:id', AdminController.getCustomerById);

// Provider Management & Verification
adminRouter.get('/providers', AdminController.getProviders);
adminRouter.get('/providers/:id', AdminController.getProviderById);
adminRouter.patch('/providers/:id/verification', AdminController.updateProviderVerification);

// User Account Status Moderation (Customers & Providers)
adminRouter.patch('/users/:id/status', AdminController.updateUserStatus);

// Booking Monitoring
adminRouter.get('/bookings', AdminController.getAllBookings);
adminRouter.get('/bookings/:id', AdminController.getBookingById);

// Service Monitoring & Moderation
adminRouter.get('/services', AdminController.getAllServices);
adminRouter.patch('/services/:id/status', AdminController.updateServiceStatus);

// Audit Trail Logs
adminRouter.get('/logs', AdminController.getAuditLogs);
