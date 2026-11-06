import { ProviderService } from '../services/provider.service.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class ProviderController {
  static async getProfile(req, res) {
    try {
      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      return sendJson(res, 200, profile, 'Provider profile retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateProfile(req, res) {
    try {
      const body = await parseJsonBody(req);
      const updated = await ProviderService.updateProfile(req.user.userId, body);
      return sendJson(res, 200, updated, 'Provider profile updated successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getPublicProfile(req, res) {
    try {
      const providerId = parseInt(req.params.id, 10);
      const profile = await ProviderService.getPublicProviderProfile(providerId);
      return sendJson(res, 200, profile, 'Public provider profile retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async searchProviders(req, res) {
    try {
      const { city, minRating, page, limit } = req.query || {};
      const result = await ProviderService.searchProviders({
        city,
        minRating: minRating ? parseFloat(minRating) : 0,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
      });
      return sendJson(res, 200, result, 'Providers retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
