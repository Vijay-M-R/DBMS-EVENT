
/**
 * Custom Lightweight Native HTTP Router
 * Compliant with strict requirements: No Express, Fastify, Nest, Koa, or Hono.
 */
export class Router {
  constructor(prefix = '') {
    this.prefix = prefix.replace(/\/+$/, '');
    this.routes = [];
    this.middlewares = [];
  }

  /**
   * Register a global middleware on this router or mount a sub-router
   */
  use(...args) {
    if (args.length === 1 && typeof args[0] === 'function') {
      this.middlewares.push(args[0]);
    } else if (args.length >= 2 && typeof args[0] === 'string') {
      const mountPath = args[0].replace(/\/+$/, '');
      const handlers = args.slice(1);

      handlers.forEach((handler) => {
        if (handler instanceof Router) {
          // Mount sub-router by adopting its routes and prefixing them
          handler.routes.forEach((r) => {
            const combinedPath = `${mountPath}${r.path === '/' ? '' : r.path}`;
            this.routes.push({
              method: r.method,
              path: combinedPath,
              paramNames: r.paramNames,
              regex: this._pathToRegex(combinedPath, r.paramNames),
              handlers: [...handler.middlewares, ...r.handlers],
            });
          });
        } else if (typeof handler === 'function') {
          this.middlewares.push((req, res, next) => {
            if (req.pathname.startsWith(mountPath)) {
              return handler(req, res, next);
            }
            next();
          });
        }
      });
    }
    return this;
  }

  get(path, ...handlers) { return this._register('GET', path, handlers); }
  post(path, ...handlers) { return this._register('POST', path, handlers); }
  put(path, ...handlers) { return this._register('PUT', path, handlers); }
  patch(path, ...handlers) { return this._register('PATCH', path, handlers); }
  delete(path, ...handlers) { return this._register('DELETE', path, handlers); }
  options(path, ...handlers) { return this._register('OPTIONS', path, handlers); }

  _register(method, path, handlers) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const paramNames = [];
    const regex = this._pathToRegex(cleanPath, paramNames);

    this.routes.push({
      method: method.toUpperCase(),
      path: cleanPath,
      paramNames,
      regex,
      handlers,
    });
    return this;
  }

  _pathToRegex(path, paramNames) {
    // Escape special regex chars except colons
    const escaped = path.replace(/([.+*?=^!:${}()|[\]/\\])/g, (match) => {
      if (match === '/' || match === ':') return match;
      return `\\${match}`;
    });

    const pattern = escaped.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    return new RegExp(`^${pattern}/?$`);
  }

  /**
   * Main request handler for native Node.js HTTP server
   */
  async handle(req, res) {
    const parsed = new URL(req.url, 'http://localhost');
    req.pathname = parsed.pathname || '/';
    req.query = Object.fromEntries(parsed.searchParams.entries());
    req.params = {};

    // Match route
    let matchedRoute = null;
    let matchValues = null;

    for (const route of this.routes) {
      if (route.method !== req.method && req.method !== 'OPTIONS') continue;

      const match = req.pathname.match(route.regex);
      if (match) {
        matchedRoute = route;
        matchValues = match.slice(1);
        break;
      }
    }

    if (!matchedRoute) {
      // If method is OPTIONS and no explicit OPTIONS route, return 204 handled by CORS
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      return null; // Route not matched
    }

    // Extract route params
    const params = {};
    matchedRoute.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(matchValues[index]);
    });
    req.params = params;

    // Chain router middlewares + matched route handlers
    const pipeline = [...this.middlewares, ...matchedRoute.handlers];
    let index = 0;

    const next = async (err) => {
      if (err) throw err;
      if (index < pipeline.length) {
        const handler = pipeline[index++];
        return handler(req, res, next);
      }
    };

    return next();
  }
}
