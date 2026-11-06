import { AvailabilityService } from '../services/availability.service.js';
import { ProviderService } from '../services/provider.service.js';
import { validateCreateSlot } from '../validators/availability.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class AvailabilityController {
  static async getAvailableSlots(req, res) {
    try {
      const providerId = parseInt(req.params.providerId, 10);
      const { startDate, endDate } = req.query || {};
      const slots = await AvailabilityService.getAvailableSlots(providerId, startDate, endDate);
      return sendJson(res, 200, slots, 'Available slots retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getProviderSlots(req, res) {
    try {
      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const { startDate } = req.query || {};
      const slots = await AvailabilityService.getProviderSlots(profile.provider_id, startDate);
      return sendJson(res, 200, slots, 'Provider slots retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async createSlot(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateCreateSlot(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const slot = await AvailabilityService.createSlot(profile.provider_id, body);
      return sendJson(res, 201, slot, 'Availability slot created successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async deleteSlot(req, res) {
    try {
      const slotId = parseInt(req.params.id, 10);
      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const deleted = await AvailabilityService.deleteSlot(profile.provider_id, slotId);
      return sendJson(res, 200, deleted, 'Availability slot removed successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
