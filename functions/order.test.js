const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTrustedOrder,
  getConfirmedPaymentStatus,
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
  orderNumber: 'VSI-1710000000000-1234',
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
    'VSI12345678901230001'
  );

  assert.equal(order.subtotal, 3000);
  assert.equal(order.discount, 300);
  assert.equal(order.shippingFee, 35000);
  assert.equal(order.total, 37700);
  assert.equal(order.total === request.total, false);
  assert.equal(order.customerUid, 'customer-uid');
  assert.equal(order.items[0].unitPrice, 1500);
});

test('rejects orders whose requested quantity exceeds the catalog stock', () => {
  assert.throws(
    () =>
      buildTrustedOrder(
        { ...request, items: [{ ...request.items[0], quantity: 6 }] },
        'customer-uid',
        catalog,
        new Date(),
        'VSI12345678901230001'
      ),
    (error) => error.code === 'failed-precondition'
  );
});

test('rejects order numbers from the previous prefix', () => {
  assert.throws(
    () =>
      buildTrustedOrder(
        { ...request, orderNumber: 'MD-1710000000000-1234' },
        'customer-uid',
        catalog,
        new Date(),
        'VSI12345678901230001'
      ),
    (error) => error.code === 'invalid-argument'
  );
});

test('allows an admin to confirm only a pending, non-cancelled VietQR order', () => {
  const pendingOrder = {
    paymentMethod: 'vietqr',
    paymentStatus: 'Chờ xác nhận thanh toán',
    orderStatus: 'Chờ xác nhận',
  };
  assert.equal(
    getConfirmedPaymentStatus(pendingOrder),
    'Đã xác nhận chuyển khoản'
  );
  assert.equal(
    getConfirmedPaymentStatus({
      ...pendingOrder,
      paymentStatus: 'Đã xác nhận chuyển khoản',
    }),
    'Đã xác nhận chuyển khoản'
  );
  assert.throws(
    () =>
      getConfirmedPaymentStatus({
        ...pendingOrder,
        orderStatus: 'Đã hủy',
      }),
    (error) => error.code === 'failed-precondition'
  );
});
