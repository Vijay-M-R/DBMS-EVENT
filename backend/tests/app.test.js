import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';

test('Native HTTP app handles /health check endpoint', async () => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'healthy');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Native HTTP app responds with 404 for unknown endpoints', async () => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/unknown-endpoint`);
    assert.equal(res.status, 404);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.message, /not found/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
