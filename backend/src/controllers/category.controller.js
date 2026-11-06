import { CategoryService } from '../services/category.service.js';
import { validateCreateCategory } from '../validators/category.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class CategoryController {
  static async getActiveCategories(req, res) {
    try {
      const categories = await CategoryService.getActiveCategories();
      return sendJson(res, 200, categories, 'Active categories retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getAllCategories(req, res) {
    try {
      const categories = await CategoryService.getAllCategories();
      return sendJson(res, 200, categories, 'All categories retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async createCategory(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateCreateCategory(body);
      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const category = await CategoryService.createCategory(body);
      return sendJson(res, 201, category, 'Category created successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async updateCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);
      const body = await parseJsonBody(req);
      const updated = await CategoryService.updateCategory(categoryId, body);
      return sendJson(res, 200, updated, 'Category updated successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
