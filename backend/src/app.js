import { Router } from './utils/router.js';
import { handleCors } from './middleware/cors.js';
import { sendJson, sendError } from './utils/response.js';
import { serveStatic } from './utils/staticServer.js';

import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { customerRouter } from './routes/customer.routes.js';
import { providerRouter } from './routes/provider.routes.js';
import { categoryRouter } from './routes/category.routes.js';
import { serviceRouter } from './routes/service.routes.js';
import { availabilityRouter } from './routes/availability.routes.js';
import { bookingRouter } from './routes/booking.routes.js';
import { reviewRouter } from './routes/review.routes.js';
import { adminRouter } from './routes/admin.routes.js';

// Root API Router
const apiRouter = new Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  return sendJson(res, 200, { status: 'healthy', timestamp: new Date().toISOString() }, 'System operational');
});

// Mount module routes under /api/v1
apiRouter.use('/api/v1/auth', authRouter);
apiRouter.use('/api/v1/users', userRouter);
apiRouter.use('/api/v1/customers', customerRouter);
apiRouter.use('/api/v1/providers', providerRouter);
apiRouter.use('/api/v1/categories', categoryRouter);
apiRouter.use('/api/v1/services', serviceRouter);
apiRouter.use('/api/v1/availability', availabilityRouter);
apiRouter.use('/api/v1/bookings', bookingRouter);
apiRouter.use('/api/v1/reviews', reviewRouter);
apiRouter.use('/api/v1/admin', adminRouter);

/**
 * Main application request listener for native Node.js http.createServer
 */
export const app = async (req, res) => {
  // 1. Handle CORS preflight and headers
  const isPreflight = handleCors(req, res);
  if (isPreflight) return;

  // 2. Request logging
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
  });

  try {
    // 3. Attempt to serve static frontend files if request is not targeted at API or health
    if (!req.url.startsWith('/api/') && !req.url.startsWith('/health')) {
      const staticServed = await serveStatic(req, res);
      if (staticServed) return;
    }

    // 4. Dispatch through router
    const handled = await apiRouter.handle(req, res);

    // 5. Fallback for unmatched routes
    if (handled === null && !res.writableEnded) {
      return sendError(res, 404, `Route ${req.method} ${req.url} not found`);
    }
  } catch (error) {
    console.error('[Unhandled Request Error]:', error);
    if (!res.writableEnded) {
      return sendError(res, error.statusCode || 500, error.message || 'Internal Server Error');
    }
  }
};
