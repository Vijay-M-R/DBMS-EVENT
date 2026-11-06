/**
 * Standard HTTP JSON Response Dispatchers
 */

export const sendJson = (res, statusCode = 200, data = null, message = 'Success') => {
  if (res.headersSent) return;
  const payload = {
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
  };
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
};

export const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  if (res.headersSent) return;
  const payload = {
    success: false,
    message,
    errors: errors ? (Array.isArray(errors) ? errors : [errors]) : undefined,
  };
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
};
