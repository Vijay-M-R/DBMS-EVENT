/**
 * Native Node.js HTTP Request Body Parser
 */

export const parseJsonBody = (req, maxBytes = 2 * 1024 * 1024) => {
  return new Promise((resolve, reject) => {
    // If body has already been parsed or method is GET/HEAD/DELETE without body
    if (req.body !== undefined) {
      return resolve(req.body);
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      req.body = {};
      return resolve(req.body);
    }

    let rawData = '';
    let receivedBytes = 0;

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        req.destroy();
        const err = new Error('Payload Too Large: Maximum allowed body size is 2MB');
        err.statusCode = 413;
        return reject(err);
      }
      rawData += chunk;
    });

    req.on('end', () => {
      if (!rawData.trim()) {
        req.body = {};
        return resolve(req.body);
      }
      try {
        req.body = JSON.parse(rawData);
        resolve(req.body);
      } catch (err) {
        const error = new Error('Malformed JSON body');
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
};
