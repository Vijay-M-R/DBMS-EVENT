import { ServiceService } from '../services/service.service.js';
import { ProviderService } from '../services/provider.service.js';
import { validateCreateService, validateUpdateService } from '../validators/service.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class ServiceController {
  static async searchServices(req, res) {
    try {
      const { search, categoryId, city, minPrice, maxPrice, sortBy, page, limit } = req.query || {};
      const result = await ServiceService.searchServices({
        search,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        city,
        minPrice,
        maxPrice,
        sortBy,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
      });
      return sendJson(res, 200, result, 'Services retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getServiceById(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const service = await ServiceService.getServiceById(serviceId);
      return sendJson(res, 200, service, 'Service details retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getProviderServices(req, res) {
    try {
      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const services = await ServiceService.getProviderServices(profile.provider_id);
      return sendJson(res, 200, services, 'Provider services retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async createService(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateCreateService(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const service = await ServiceService.createService(profile.provider_id, body);
      return sendJson(res, 201, service, 'Service listing created successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateService(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateUpdateService(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const updated = await ServiceService.updateService(profile.provider_id, serviceId, body);
      return sendJson(res, 200, updated, 'Service listing updated successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async deleteService(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const profile = await ProviderService.getProfileByUserId(req.user.userId);
      const deleted = await ServiceService.deleteService(profile.provider_id, serviceId);
      return sendJson(res, 200, deleted, 'Service listing removed successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
