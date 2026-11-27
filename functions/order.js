const ORDER_NUMBER_PATTERN = /^VSI-\d{13}-\d{4}$/;

function isValidOrderNumber(orderNumber) {
  return ORDER_NUMBER_PATTERN.test(orderNumber);
}

class OrderValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function getConfirmedPaymentStatus(order) {
  if (order.paymentMethod !== 'vietqr') {
    throw new OrderValidationError(
      'failed-precondition',
      'Đơn hàng này không sử dụng chuyển khoản VietQR.'
    );
  }
  if (order.orderStatus === 'Đã hủy') {
    throw new OrderValidationError(
      'failed-precondition',
      'Không thể xác nhận thanh toán cho đơn hàng đã hủy.'
    );
  }
  if (order.paymentStatus === 'Đã xác nhận chuyển khoản') {
    return order.paymentStatus;
  }
  if (order.paymentStatus !== 'Chờ xác nhận thanh toán') {
    throw new OrderValidationError(
      'failed-precondition',
      'Đơn hàng không còn ở trạng thái chờ xác nhận thanh toán.'
    );
  }
  return 'Đã xác nhận chuyển khoản';
}

function requiredText(value, field, maxLength) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw new OrderValidationError('invalid-argument', `Thông tin ${field} không hợp lệ.`);
  }
  return value.trim();
}

function buildTrustedOrder(input, customerUid, productsById, now, paymentReference) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OrderValidationError('invalid-argument', 'Dữ liệu đơn hàng không hợp lệ.');
  }

  const orderNumber = requiredText(input.orderNumber, 'mã đơn hàng', 32);
  if (!isValidOrderNumber(orderNumber)) {
    throw new OrderValidationError('invalid-argument', 'Mã đơn hàng không hợp lệ.');
  }

  const customerName = requiredText(input.customerName, 'họ tên', 120);
  const phone = requiredText(input.phone, 'số điện thoại', 24);
  if (!/^(0|\+84)\d{8,10}$/.test(phone.replace(/\s+/g, ''))) {
    throw new OrderValidationError('invalid-argument', 'Số điện thoại không hợp lệ.');
  }
  const email = requiredText(input.email, 'email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OrderValidationError('invalid-argument', 'Email không hợp lệ.');
  }
  const address = requiredText(input.address, 'địa chỉ', 500);
  const city = requiredText(input.city, 'tỉnh/thành phố', 120);

  if (!['standard', 'express'].includes(input.shippingMethod)) {
    throw new OrderValidationError('invalid-argument', 'Phương thức giao hàng không hợp lệ.');
  }
  if (!['vietqr', 'cod'].includes(input.paymentMethod)) {
    throw new OrderValidationError('invalid-argument', 'Phương thức thanh toán chưa được hỗ trợ.');
  }
  if (
    input.promoCode !== undefined &&
    input.promoCode !== null &&
    !['MOCDAT10', 'FREESHIP'].includes(input.promoCode)
  ) {
    throw new OrderValidationError('invalid-argument', 'Mã ưu đãi không hợp lệ.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 30) {
    throw new OrderValidationError('invalid-argument', 'Danh sách sản phẩm không hợp lệ.');
  }

  const items = input.items.map((item) => {
    if (
      !item ||
      typeof item.productId !== 'string' ||
      typeof item.variantId !== 'string' ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 30
    ) {
      throw new OrderValidationError('invalid-argument', 'Sản phẩm trong đơn hàng không hợp lệ.');
    }

    const product = productsById.get(item.productId);
    if (!product || !Array.isArray(product.variants)) {
      throw new OrderValidationError(
        'failed-precondition',
        'Sản phẩm chưa được đồng bộ lên Firebase. Vui lòng liên hệ quản trị viên.'
      );
    }
    const variant = product.variants.find((candidate) => candidate.id === item.variantId);
    if (
      !variant ||
      product.inStock === false ||
      !Number.isSafeInteger(variant.stock) ||
      variant.stock < item.quantity
    ) {
      throw new OrderValidationError(
        'failed-precondition',
        `Sản phẩm "${product.name}" hoặc phân loại đã hết hàng.`
      );
    }
    if (
      !Number.isSafeInteger(product.price) ||
      !Number.isSafeInteger(variant.priceDelta ?? 0) ||
      product.price + (variant.priceDelta ?? 0) < 0
    ) {
      throw new OrderValidationError(
        'failed-precondition',
        `Giá sản phẩm "${product.name}" chưa được cấu hình hợp lệ.`
      );
    }

    const unitPrice = product.price + (variant.priceDelta ?? 0);
    const orderItem = {
      productId: item.productId,
      variantId: item.variantId,
      name: product.name,
      variantLabel: variant.label,
      unitPrice,
      quantity: item.quantity,
      image: product.image,
    };
    if (typeof product.category === 'string') {
      orderItem.category = product.category;
    }
    return orderItem;
  });

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  if (!Number.isSafeInteger(subtotal)) {
    throw new OrderValidationError('failed-precondition', 'Tổng tiền đơn hàng không hợp lệ.');
  }

  const promoCode = input.promoCode || null;
  const discount = promoCode === 'MOCDAT10' ? Math.round(subtotal * 0.1) : 0;
  const shippingFee =
    input.shippingMethod === 'express'
      ? 65000
      : promoCode === 'FREESHIP' || subtotal - discount >= 1500000
        ? 0
        : 35000;
  const total = subtotal - discount + shippingFee;
  const deliveryDate = new Date(
    now.getTime() + (input.shippingMethod === 'express' ? 1 : 3) * 24 * 60 * 60 * 1000
  );

  return {
    orderNumber,
    customerUid,
    createdAt: now.toISOString(),
    customerName,
    phone,
    email,
    address,
    city,
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    ...(input.paymentMethod === 'vietqr' ? { paymentReference } : {}),
    paymentStatus:
      input.paymentMethod === 'cod'
        ? 'Thanh toán khi nhận hàng'
        : 'Chờ xác nhận thanh toán',
    orderStatus: 'Chờ xác nhận',
    estimatedDelivery: deliveryDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    subtotal,
    discount,
    shippingFee,
    total,
    ...(promoCode ? { promoCode } : {}),
    items,
  };
}

module.exports = {
  OrderValidationError,
  buildTrustedOrder,
  getConfirmedPaymentStatus,
  isValidOrderNumber,
};
