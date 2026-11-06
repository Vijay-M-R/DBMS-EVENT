import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { generateToken, verifyToken } from '../src/utils/jwt.js';

test('Password hashing and comparison', async () => {
  const plain = 'SecurePassword123!';
  const hash = await hashPassword(plain);

  assert.notEqual(hash, plain);
  const isMatch = await comparePassword(plain, hash);
  assert.equal(isMatch, true);

  const isInvalid = await comparePassword('WrongPassword', hash);
  assert.equal(isInvalid, false);
});

test('JWT signing and verification', () => {
  const payload = { userId: 101, email: 'provider@example.com', role: 'PROVIDER' };
  const token = generateToken(payload);

  assert.ok(typeof token === 'string' && token.length > 20);

  const decoded = verifyToken(token);
  assert.equal(decoded.userId, 101);
  assert.equal(decoded.email, 'provider@example.com');
  assert.equal(decoded.role, 'PROVIDER');
});
