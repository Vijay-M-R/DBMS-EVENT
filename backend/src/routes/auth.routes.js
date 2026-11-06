import { Router } from '../utils/router.js';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = new Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.get('/me', authenticate, AuthController.getMe);
