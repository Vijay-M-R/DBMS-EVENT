import { CustomerService } from '../services/customer.service.js';
import { validateCreateAddress } from '../validators/address.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class CustomerController {
  static async getProfile(req, res) {
    try {
      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      return sendJson(res, 200, profile, 'Customer profile retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateProfile(req, res) {
    try {
      const body = await parseJsonBody(req);
      const updated = await CustomerService.updateProfile(req.user.userId, body);
      return sendJson(res, 200, updated, 'Customer profile updated successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getAddresses(req, res) {
    try {
      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const addresses = await CustomerService.getAddresses(profile.customer_id);
      return sendJson(res, 200, addresses, 'Customer addresses retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async addAddress(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateCreateAddress(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const address = await CustomerService.addAddress(profile.customer_id, body);
      return sendJson(res, 201, address, 'Address added successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async setDefaultAddress(req, res) {
    try {
      const addressId = parseInt(req.params.id, 10);
      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const updated = await CustomerService.setDefaultAddress(profile.customer_id, addressId);
      return sendJson(res, 200, updated, 'Default address updated');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async deleteAddress(req, res) {
    try {
      const addressId = parseInt(req.params.id, 10);
      const profile = await CustomerService.getProfileByUserId(req.user.userId);
      const deleted = await CustomerService.deleteAddress(profile.customer_id, addressId);
      return sendJson(res, 200, deleted, 'Address removed successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
