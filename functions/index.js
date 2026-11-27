const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { randomInt } = require('node:crypto');
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https');
const {
  OrderValidationError,
  buildTrustedOrder,
  getConfirmedPaymentStatus,
  isValidOrderNumber,
} = require('./order');
const {
  extractPaymentReference,
  isValidSePayPayload,
  verifySePaySignature,
} = require('./payment');

initializeApp();

const sepayWebhookSecret = defineSecret('SEPAY_WEBHOOK_SECRET');
const sepayBankAccountNumber = defineSecret('SEPAY_BANK_ACCOUNT_NUMBER');

exports.createCustomerOrder = onCall(
  { region: 'asia-southeast1', maxInstances: 10 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vui lòng đăng nhập trước khi đặt hàng.');
    }

    const input = request.data;
    if (
      !input ||
      !Array.isArray(input.items) ||
      input.items.length === 0 ||
      input.items.length > 30 ||
      input.items.some(
        (item) =>
          !item ||
          typeof item.productId !== 'string' ||
          item.productId.length === 0 ||
          item.productId.includes('/') ||
          typeof item.variantId !== 'string' ||
          item.variantId.length === 0
      )
    ) {
      throw new HttpsError('invalid-argument', 'Danh sách sản phẩm không hợp lệ.');
    }

    const db = getFirestore();
    const productRefs = [
      ...new Map(
        input.items.map((item) => [
          item.productId,
          db.collection('products').doc(item.productId),
        ])
      ).values(),
    ];
    const paymentReference =
      input.paymentMethod === 'vietqr'
        ? `VSI${Date.now()}${randomInt(1000, 10000)}`
        : undefined;
    let savedOrder;

    try {
      await db.runTransaction(async (transaction) => {
        const productsById = new Map();
        for (const productRef of productRefs) {
          const productSnapshot = await transaction.get(productRef);
          if (productSnapshot.exists) {
            productsById.set(productRef.id, productSnapshot.data());
          }
        }

        savedOrder = buildTrustedOrder(
          input,
          request.auth.uid,
          productsById,
          new Date(),
          paymentReference
        );
        transaction.create(
          db.collection('orders').doc(savedOrder.orderNumber),
          savedOrder
        );
      });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        throw new HttpsError(error.code, error.message);
      }
      logger.error('Failed to create customer order.', error);
      throw new HttpsError('internal', 'Không thể lưu đơn hàng. Vui lòng thử lại.');
    }

    return savedOrder;
  }
);

exports.confirmCustomerOrderPayment = onCall(
  { region: 'asia-southeast1', maxInstances: 10 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vui lòng đăng nhập tài khoản quản trị.');
    }

    const { orderNumber } = request.data ?? {};
    if (typeof orderNumber !== 'string' || !isValidOrderNumber(orderNumber)) {
      throw new HttpsError('invalid-argument', 'Mã đơn hàng không hợp lệ.');
    }

    const db = getFirestore();
    const adminSnapshot = await db
      .collection('admins')
      .doc(request.auth.uid)
      .get();
    if (adminSnapshot.data()?.role !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Tài khoản Firebase này chưa được cấp quyền quản trị viên.'
      );
    }

    const orderRef = db.collection('orders').doc(orderNumber);
    try {
      const paymentStatus = await db.runTransaction(async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists) {
          throw new HttpsError('not-found', 'Không tìm thấy đơn hàng.');
        }

        const status = getConfirmedPaymentStatus(orderSnapshot.data());
        if (status !== orderSnapshot.data().paymentStatus) {
          transaction.update(orderRef, { paymentStatus: status });
        }
        return status;
      });

      return { orderNumber, paymentStatus };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof OrderValidationError) {
        throw new HttpsError(error.code, error.message);
      }
      logger.error('Failed to confirm customer order payment.', error);
      throw new HttpsError(
        'internal',
        'Không thể xác nhận thanh toán. Vui lòng thử lại.'
      );
    }
  }
);

exports.sepayWebhook = onRequest(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 15,
    maxInstances: 5,
    secrets: [sepayWebhookSecret, sepayBankAccountNumber],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST').status(405).json({ success: false });
      return;
    }

    const rawBody = req.rawBody;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      res.status(400).json({ success: false });
      return;
    }

    const signature = req.get('x-sepay-signature') || '';
    const timestamp = req.get('x-sepay-timestamp') || '';
    if (
      !verifySePaySignature(
        rawBody,
        signature,
        timestamp,
        sepayWebhookSecret.value()
      )
    ) {
      res.status(401).json({ success: false });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).json({ success: false });
      return;
    }

    if (!isValidSePayPayload(payload)) {
      res.status(400).json({ success: false });
      return;
    }

    if (payload.transferType !== 'in') {
      res.status(200).json({ success: true });
      return;
    }

    const expectedAccountNumber = sepayBankAccountNumber
      .value()
      .replace(/\D/g, '');
    if (!expectedAccountNumber) {
      logger.error('SEPAY_BANK_ACCOUNT_NUMBER is not configured.');
      res.status(500).json({ success: false });
      return;
    }

    const receivedAccountNumber = payload.accountNumber.replace(/\D/g, '');
    if (receivedAccountNumber !== expectedAccountNumber) {
      logger.warn('Ignoring SePay transaction for a different bank account.');
      res.status(200).json({ success: true });
      return;
    }

    try {
      const paymentReference = extractPaymentReference(payload);
      const db = getFirestore();
      const eventId = String(payload.id);
      const eventRef = db.collection('sepayEvents').doc(eventId);
      const matchingOrders = paymentReference
        ? await db
            .collection('orders')
            .where('paymentReference', '==', paymentReference)
            .limit(2)
            .get()
        : null;

      const outcome = await db.runTransaction(async (transaction) => {
        const existingEvent = await transaction.get(eventRef);
        if (existingEvent.exists) return 'duplicate';

        let status = 'unmatched_reference';
        let orderNumber = null;
        if (matchingOrders && matchingOrders.size === 1) {
          const orderRef = matchingOrders.docs[0].ref;
          const orderSnapshot = await transaction.get(orderRef);
          if (!orderSnapshot.exists) {
            status = 'order_not_found';
          } else {
            const order = orderSnapshot.data();
            orderNumber = order.orderNumber || null;
            if (order.paymentMethod !== 'vietqr') {
              status = 'not_vietqr_order';
            } else if (order.orderStatus === 'Đã hủy') {
              status = 'order_cancelled';
            } else if (order.paymentStatus !== 'Chờ xác nhận thanh toán') {
              status = 'payment_not_pending';
            } else if (order.total !== payload.transferAmount) {
              status = 'amount_mismatch';
            } else {
              transaction.update(orderRef, {
                paymentStatus: 'Đã xác nhận chuyển khoản',
              });
              status = 'paid';
            }
          }
        } else if (matchingOrders && matchingOrders.size > 1) {
          status = 'ambiguous_reference';
        }

        transaction.create(eventRef, {
          transferId: eventId,
          paymentReference,
          orderNumber,
          amount: payload.transferAmount,
          status,
          processedAt: FieldValue.serverTimestamp(),
        });
        return status;
      });

      logger.info('Processed SePay webhook.', { transferId: eventId, outcome });
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Failed to process SePay webhook.', error);
      res.status(500).json({ success: false });
    }
  }
);
