const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  extractPaymentReference,
  isValidSePayPayload,
  verifySePaySignature,
} = require('./payment');

test('verifies a fresh SePay HMAC against the exact raw body', () => {
  const body = Buffer.from('{"id":42,"content":"VSI12345678901230001"}');
  const timestamp = '1710000000';
  const secret = 'test-secret';
  const signature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body.toString('utf8')}`)
    .digest('hex')}`;

  assert.equal(verifySePaySignature(body, signature, timestamp, secret, 1710000000), true);
  assert.equal(
    verifySePaySignature(Buffer.from(`${body.toString('utf8')} `), signature, timestamp, secret, 1710000000),
    false
  );
  assert.equal(verifySePaySignature(body, signature, timestamp, secret, 1710000400), false);
});

test('extracts only well-formed references from SePay code or content', () => {
  const reference = 'VSI-0123456789abcdef0123456789abcdef';
  assert.equal(
    extractPaymentReference({ code: reference.toUpperCase(), content: '' }),
    reference.toUpperCase()
  );
  assert.equal(
    extractPaymentReference({ code: null, content: `Thanh toan ${reference} don hang` }),
    reference.toUpperCase()
  );
  assert.equal(extractPaymentReference({ code: null, content: 'VSI1234' }), null);
});

test('accepts only positive integer VND transfer amounts and required identifiers', () => {
  const payload = {
    id: 1,
    accountNumber: '123456789',
    transferType: 'in',
    transferAmount: 10000,
    content: 'VSI12345678901230001',
  };
  assert.equal(isValidSePayPayload(payload), true);
  assert.equal(isValidSePayPayload({ ...payload, transferAmount: 10.5 }), false);
  assert.equal(isValidSePayPayload({ ...payload, id: undefined }), false);
});
