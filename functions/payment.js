const crypto = require('node:crypto');

const PAYMENT_REFERENCE_PATTERN = /^VSI-[a-f0-9]{32}$/i;
const PAYMENT_REFERENCE_IN_TEXT_PATTERN = /\bVSI-[a-f0-9]{32}\b/i;

function verifySePaySignature(rawBody, signature, timestamp, secret, nowSeconds = Date.now() / 1000) {
  const timestampSeconds = Number(timestamp);
  if (
    !Buffer.isBuffer(rawBody) ||
    !signature ||
    !Number.isInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > 300
  ) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(`${timestampSeconds}.${rawBody.toString('utf8')}`)
    .digest('hex')}`;
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function extractPaymentReference(payload) {
  if (typeof payload.code === 'string') {
    const code = payload.code.trim();
    if (PAYMENT_REFERENCE_PATTERN.test(code)) return code.toUpperCase();
  }

  if (typeof payload.content === 'string') {
    const match = payload.content.match(PAYMENT_REFERENCE_IN_TEXT_PATTERN);
    if (match) return match[0].toUpperCase();
  }

  return null;
}

function isValidSePayPayload(payload) {
  const validId =
    (typeof payload?.id === 'number' &&
      Number.isSafeInteger(payload.id) &&
      payload.id >= 0) ||
    (typeof payload?.id === 'string' && /^\d{1,32}$/.test(payload.id));

  return (
    payload !== null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    validId &&
    typeof payload.accountNumber === 'string' &&
    typeof payload.transferType === 'string' &&
    typeof payload.transferAmount === 'number' &&
    Number.isSafeInteger(payload.transferAmount) &&
    payload.transferAmount > 0 &&
    typeof payload.content === 'string'
  );
}

module.exports = {
  extractPaymentReference,
  isValidSePayPayload,
  verifySePaySignature,
};
