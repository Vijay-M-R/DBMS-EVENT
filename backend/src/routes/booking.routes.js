import { Router } from '../utils/router.js';
import { BookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const bookingRouter = new Router();

// Customer: Place and view bookings
bookingRouter.post('/', authenticate, authorize('CUSTOMER'), BookingController.createBooking);
bookingRouter.get('/customer/history', authenticate, authorize('CUSTOMER'), BookingController.getCustomerBookings);

// Provider: View incoming requests
bookingRouter.get('/provider/history', authenticate, authorize('PROVIDER'), BookingController.getProviderBookings);

// Booking detail & status updates (Customer cancellation, Provider accept/reject/complete)
bookingRouter.get('/:id', authenticate, BookingController.getBookingById);
bookingRouter.patch('/:id/status', authenticate, BookingController.updateBookingStatus);
