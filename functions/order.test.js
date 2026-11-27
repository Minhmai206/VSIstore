const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAdminPaymentUpdate,
  buildTrustedOrder,
} = require('./order');

const catalog = new Map([
  [
    'tool-kit',
    {
      name: 'Bộ kit thủ công',
      category: 'Bộ kit',
      price: 1000,
      image: '/tool-kit.png',
      inStock: true,
      variants: [{ id: 'standard', label: 'Tiêu chuẩn', priceDelta: 500, stock: 5 }],
    },
  ],
]);

const request = {
  orderNumber: 'VSI-0123456789abcdef0123456789abcdef',
  customerName: 'Nguyễn An',
  phone: '0912345678',
  email: 'an@example.com',
  address: 'Số 1 đường A',
  city: 'Hà Nội',
  shippingMethod: 'standard',
  paymentMethod: 'vietqr',
  promoCode: 'MOCDAT10',
  total: 1,
  items: [{ productId: 'tool-kit', variantId: 'standard', quantity: 2 }],
};

test('builds the payable total from catalog prices, not client-supplied totals', () => {
  const order = buildTrustedOrder(
    request,
    'customer-uid',
    catalog,
    new Date('2026-01-01T00:00:00.000Z'),
    request.orderNumber
  );

  assert.equal(order.subtotal, 3000);
  assert.equal(order.discount, 300);
  assert.equal(order.shippingFee, 35000);
  assert.equal(order.total, 37700);
  assert.equal(order.total === request.total, false);
  assert.equal(order.customerUid, 'customer-uid');
  assert.equal(order.items[0].unitPrice, 1500);
  assert.equal(order.paymentReference, request.orderNumber);
  assert.equal(order.paymentStatus, 'pending_payment');
});

test('rejects orders whose requested quantity exceeds the catalog stock', () => {
  assert.throws(
    () =>
      buildTrustedOrder(
        { ...request, items: [{ ...request.items[0], quantity: 6 }] },
        'customer-uid',
        catalog,
        new Date(),
        request.orderNumber
      ),
    (error) => error.code === 'failed-precondition'
  );
});

test('rejects order numbers from the previous prefix', () => {
  assert.throws(
    () =>
      buildTrustedOrder(
        { ...request, orderNumber: 'MD-0123456789abcdef0123456789abcdef' },
        'customer-uid',
        catalog,
        new Date(),
        request.orderNumber
      ),
    (error) => error.code === 'invalid-argument'
  );
});

test('allows an admin to confirm a customer-submitted VietQR payment', () => {
  const pendingOrder = {
    paymentMethod: 'vietqr',
    paymentStatus: 'awaiting_confirmation',
    orderStatus: 'Chờ xác nhận',
  };
  assert.equal(
    buildAdminPaymentUpdate(
      pendingOrder,
      true,
      undefined,
      new Date('2026-01-01T00:00:00.000Z')
    ).paymentStatus,
    'paid'
  );
  assert.equal(
    buildAdminPaymentUpdate(
      pendingOrder,
      false,
      'Chưa thấy giao dịch',
      new Date('2026-01-01T00:00:00.000Z')
    ).paymentNote,
    'Chưa thấy giao dịch'
  );
  assert.throws(
    () => buildAdminPaymentUpdate(pendingOrder, false, ''),
    (error) => error.code === 'invalid-argument'
  );
  assert.throws(
    () =>
      buildAdminPaymentUpdate({
        ...pendingOrder,
        orderStatus: 'Đã hủy',
      }, true),
    (error) => error.code === 'failed-precondition'
  );
});
