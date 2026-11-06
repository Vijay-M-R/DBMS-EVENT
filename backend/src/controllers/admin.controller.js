import { AdminService } from '../services/admin.service.js';
import {
  validateProviderVerification,
  validateUserStatus,
  validateServiceStatus,
} from '../validators/admin.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class AdminController {
  static async getDashboardStats(req, res) {
    try {
      const stats = await AdminService.getDashboardStats();
      return sendJson(res, 200, stats, 'Admin dashboard statistics retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getCustomers(req, res) {
    try {
      const { status, page, limit } = req.query || {};
      const result = await AdminService.getCustomers({
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      return sendJson(res, 200, result, 'Customers retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getCustomerById(req, res) {
    try {
      const customerId = parseInt(req.params.id, 10);
      const customer = await AdminService.getCustomerById(customerId);
      return sendJson(res, 200, customer, 'Customer details retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getProviders(req, res) {
    try {
      const { verificationStatus, city, page, limit } = req.query || {};
      const result = await AdminService.getProviders({
        verificationStatus,
        city,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      return sendJson(res, 200, result, 'Providers retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getProviderById(req, res) {
    try {
      const providerId = parseInt(req.params.id, 10);
      const provider = await AdminService.getProviderById(providerId);
      return sendJson(res, 200, provider, 'Provider details retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateProviderVerification(req, res) {
    try {
      const providerId = parseInt(req.params.id, 10);
      if (isNaN(providerId)) {
        return sendError(res, 400, 'Invalid provider ID');
      }

      const body = await parseJsonBody(req);
      const { isValid, errors } = validateProviderVerification(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const updated = await AdminService.updateProviderVerification(req.user.userId, providerId, body);
      return sendJson(res, 200, updated, `Provider verification status updated to ${body.verification_status}`);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateUserStatus(req, res) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return sendError(res, 400, 'Invalid user ID');
      }

      const body = await parseJsonBody(req);
      const { isValid, errors } = validateUserStatus(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const updated = await AdminService.updateUserStatus(req.user.userId, userId, body);
      return sendJson(res, 200, updated, `User account status updated to ${body.account_status}`);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getAllBookings(req, res) {
    try {
      const { status, page, limit } = req.query || {};
      const result = await AdminService.getAllBookings({
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      return sendJson(res, 200, result, 'All bookings retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getBookingById(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const booking = await AdminService.getBookingById(bookingId);
      return sendJson(res, 200, booking, 'Booking details retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getAllServices(req, res) {
    try {
      const { status, categoryId, search, page, limit } = req.query || {};
      const result = await AdminService.getAllServices({
        status,
        categoryId,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      return sendJson(res, 200, result, 'All platform services retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateServiceStatus(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      if (isNaN(serviceId)) {
        return sendError(res, 400, 'Invalid service ID');
      }

      const body = await parseJsonBody(req);
      const { isValid, errors } = validateServiceStatus(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const updated = await AdminService.updateServiceStatus(req.user.userId, serviceId, body);
      return sendJson(res, 200, updated, `Service status updated to ${body.service_status}`);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getAuditLogs(req, res) {
    try {
      const { actionType, page, limit } = req.query || {};
      const result = await AdminService.getAuditLogs({
        actionType,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });
      return sendJson(res, 200, result, 'Audit logs retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
