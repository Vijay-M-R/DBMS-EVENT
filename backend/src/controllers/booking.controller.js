import { BookingService } from '../services/booking.service.js';
import { CustomerService } from '../services/customer.service.js';
import { ProviderService } from '../services/provider.service.js';
import { validateCreateBooking, validateUpdateBookingStatus } from '../validators/booking.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class BookingController {
  static async createBooking(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateCreateBooking(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const booking = await BookingService.createBooking(profile.customer_id, body);
      return sendJson(res, 201, booking, 'Booking created successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateBookingStatus(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateUpdateBookingStatus(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const updated = await BookingService.updateBookingStatus(req.user, bookingId, body);
      return sendJson(res, 200, updated, `Booking status updated to ${body.booking_status}`);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getCustomerBookings(req, res) {
    try {
      const { status } = req.query || {};
      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const bookings = await BookingService.getCustomerBookings(profile.customer_id, status);
      return sendJson(res, 200, bookings, 'Customer bookings retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getProviderBookings(req, res) {
    try {
      const { status } = req.query || {};
      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const bookings = await BookingService.getProviderBookings(profile.provider_id, status);
      return sendJson(res, 200, bookings, 'Provider bookings retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getBookingById(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const booking = await BookingService.getBookingById(bookingId);
      return sendJson(res, 200, booking, 'Booking details retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
