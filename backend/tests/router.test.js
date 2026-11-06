import test from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/utils/router.js';

test('Router should match static and parameterized routes correctly', async () => {
  const router = new Router();
  let calledWith = null;

  router.get('/api/v1/services/:id', (req, res) => {
    calledWith = req.params.id;
  });

  const mockReq = {
    method: 'GET',
    url: '/api/v1/services/42?filter=active',
    headers: {},
  };
  const mockRes = {
    headersSent: false,
    writeHead: () => {},
    end: () => {},
  };

  await router.handle(mockReq, mockRes);
  assert.equal(calledWith, '42');
  assert.equal(mockReq.query.filter, 'active');
});

test('Router should support sub-router mounting with prefixes', async () => {
  const rootRouter = new Router();
  const subRouter = new Router();
  let hit = false;

  subRouter.post('/create', (req, res) => {
    hit = true;
  });

  rootRouter.use('/api/v1/sub', subRouter);

  const mockReq = {
    method: 'POST',
    url: '/api/v1/sub/create',
    headers: {},
  };
  const mockRes = {
    headersSent: false,
    writeHead: () => {},
    end: () => {},
  };

  await rootRouter.handle(mockReq, mockRes);
  assert.equal(hit, true);
});
