import { Router } from '../utils/router.js';
import { authenticate } from '../middleware/auth.js';
import { AuthController } from '../controllers/auth.controller.js';

export const userRouter = new Router();

userRouter.get('/profile', authenticate, AuthController.getMe);
