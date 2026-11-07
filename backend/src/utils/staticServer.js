import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolved canonical path to the frontend directory
const FRONTEND_DIR = path.resolve(__dirname, '../../../frontend');

// Strict whitelist of allowable static file extensions and their MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Native Node.js static file server helper.
 * Enforces strict directory containment, canonical realpath symlink resolution,
 * and a whitelist of safe public file extensions.
 * 
 * @param {import('http').IncomingMessage} req 
 * @param {import('http').ServerResponse} res 
 * @returns {Promise<boolean>} true if the request was handled as a static file, false otherwise
 */
export async function serveStatic(req, res) {
  // Only handle GET and HEAD requests for static assets
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  // Parse path and strip query strings
  const parsedUrl = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Friendly route redirects:
  // Root '/' -> '/login.html'
  if (pathname === '/' || pathname === '') {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return true;
  }

  // '/provider' or '/provider/' -> '/provider/index.html'
  if (pathname === '/provider' || pathname === '/provider/') {
    pathname = '/provider/index.html';
  }

  // Construct absolute candidate path
  const safeRelative = pathname.replace(/^\/+/, '');
  const candidatePath = path.resolve(FRONTEND_DIR, safeRelative);

  try {
    // 1. Resolve canonical real paths for both the frontend directory and target file
    // to strictly protect against symlink escapes and directory traversal.
    const realBaseDir = await fs.promises.realpath(FRONTEND_DIR);
    
    // Check if candidate exists before resolving realpath
    let stats;
    try {
      stats = await fs.promises.stat(candidatePath);
    } catch {
      // File does not exist
      return false;
    }

    if (stats.isDirectory()) {
      // Check if an index.html exists inside the directory
      const indexPath = path.join(candidatePath, 'index.html');
      try {
        const indexStats = await fs.promises.stat(indexPath);
        if (indexStats.isFile()) {
          return serveFile(indexPath, realBaseDir, req, res);
        }
      } catch {
        return false;
      }
      return false;
    }

    if (!stats.isFile()) {
      return false;
    }

    return await serveFile(candidatePath, realBaseDir, req, res);
  } catch (err) {
    console.error('[Static Server Error]:', err.message);
    return false;
  }
}

/**
 * Serves a validated file with appropriate MIME headers and containment check.
 */
async function serveFile(filePath, realBaseDir, req, res) {
  const realTarget = await fs.promises.realpath(filePath);

  // Strict containment check: realTarget must start with realBaseDir + path.sep
  if (!realTarget.startsWith(realBaseDir + path.sep) && realTarget !== realBaseDir) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access outside static web root is prohibited.');
    return true;
  }

  // Check file extension against strict MIME whitelist
  const ext = path.extname(realTarget).toLowerCase();
  const contentType = MIME_TYPES[ext];

  if (!contentType) {
    // Prohibited file extension (e.g., .env, .sql, .js outside allowed types, configs)
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Requested asset type is not permitted.');
    return true;
  }

  // Read and serve file
  const fileContent = await fs.promises.readFile(realTarget);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(fileContent),
    'Cache-Control': 'no-cache', // Ensure live testing reflects edits immediately
  });

  if (req.method !== 'HEAD') {
    res.write(fileContent);
  }
  res.end();
  return true;
}
