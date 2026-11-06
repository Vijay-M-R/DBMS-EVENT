import { Router } from '../utils/router.js';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

export const categoryRouter = new Router();

// Public: View active categories
categoryRouter.get('/', CategoryController.getActiveCategories);

// Admin: Manage categories
categoryRouter.get('/all', authenticate, authorize('ADMIN'), CategoryController.getAllCategories);
categoryRouter.post('/', authenticate, authorize('ADMIN'), CategoryController.createCategory);
categoryRouter.put('/:id', authenticate, authorize('ADMIN'), CategoryController.updateCategory);
categoryRouter.delete('/:id', authenticate, authorize('ADMIN'), CategoryController.deleteCategory);
