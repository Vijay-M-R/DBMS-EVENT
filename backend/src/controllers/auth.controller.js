import { AuthService } from '../services/auth.service.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';
import { parseJsonBody } from '../utils/bodyParser.js';
import { sendJson, sendError } from '../utils/response.js';

export class AuthController {
  static async register(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateRegister(body);

      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const result = await AuthService.register(body);
      return sendJson(res, 201, result, 'User registered successfully');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async login(req, res) {
    try {
      const body = await parseJsonBody(req);
      const { isValid, errors } = validateLogin(body);

      if (!isValid) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const result = await AuthService.login(body);
      return sendJson(res, 200, result, 'Login successful');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }

  static async getMe(req, res) {
    try {
      // req.user is set by authenticate middleware
      return sendJson(res, 200, req.user, 'Current user retrieved');
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
}
