import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { INITIAL_ORDERS } from '../data/products';
import { Order, OrderStatus, Product } from '../types/shop';
import {
  getFirebaseFunctionsInstance,
  getFirestoreInstance,
  isFirebaseConfigured,
} from './firebaseConfig';

const ORDERS_STORAGE_KEY = 'moc_dat_orders_v1';
const PRODUCTS_STORAGE_KEY = 'moc_dat_products_v1';
const CUSTOMER_ORDER_IDS_STORAGE_KEY = 'moc_dat_customer_order_ids_v1';
const PENDING_CUSTOMER_ORDER_STORAGE_KEY = 'moc_dat_pending_customer_order_v1';
const customerOrderObservers = new Map<string, Set<(orderNumber: string) => void>>();
export type StorageBackendMode = 'firebase' | 'localhost';

function customerOrderIdsKey(customerUid: string): string {
  return `${CUSTOMER_ORDER_IDS_STORAGE_KEY}_${customerUid}`;
}

function pendingCustomerOrderKey(customerUid: string): string {
  return `${PENDING_CUSTOMER_ORDER_STORAGE_KEY}_${customerUid}`;
}

function rememberCustomerOrderId(customerUid: string, orderNumber: string): void {
  let validOrderNumbers: string[] = [];
  try {
    const stored = localStorage.getItem(customerOrderIdsKey(customerUid));
    const orderNumbers = stored ? (JSON.parse(stored) as unknown) : [];
    validOrderNumbers = Array.isArray(orderNumbers)
      ? orderNumbers.filter(
          (value): value is string =>
            typeof value === 'string' &&
            (/^VSI-[a-f0-9]{32}$/i.test(value) ||
              /^VSI-\d{13}-\d{4}$/i.test(value))
        )
      : [];
    if (!validOrderNumbers.includes(orderNumber)) {
      localStorage.setItem(
        customerOrderIdsKey(customerUid),
        JSON.stringify([...validOrderNumbers, orderNumber])
      );
    }
  } catch (error) {
    console.warn('Could not persist the customer order ID.', error);
  }
  customerOrderObservers
    .get(customerUid)
    ?.forEach((subscribeToOrder) => subscribeToOrder(orderNumber));
}

function getKnownCustomerOrderIds(customerUid: string): string[] {
  try {
    const stored = localStorage.getItem(customerOrderIdsKey(customerUid));
    const orderNumbers: unknown = stored ? JSON.parse(stored) : [];
    const validOrderNumbers = new Set(
      Array.isArray(orderNumbers)
        ? orderNumbers.filter(
            (value): value is string =>
              typeof value === 'string' &&
              (/^VSI-[a-f0-9]{32}$/i.test(value) ||
                /^VSI-\d{13}-\d{4}$/i.test(value))
          )
        : []
    );
    for (const order of readLocalOrders()) {
      if (order.customerUid === customerUid) validOrderNumbers.add(order.orderNumber);
    }
    const result = [...validOrderNumbers];
    localStorage.setItem(customerOrderIdsKey(customerUid), JSON.stringify(result));
    return result;
  } catch (error) {
    console.warn('Could not read the customer order IDs.', error);
    return [];
  }
}

export function readPendingCustomerOrderNumber(customerUid: string): string | null {
  try {
    return localStorage.getItem(pendingCustomerOrderKey(customerUid));
  } catch (error) {
    console.warn('Could not read the pending customer order ID.', error);
    return null;
  }
}

function rememberPendingCustomerOrder(order: Order): void {
  if (
    !order.customerUid ||
    order.paymentMethod !== 'vietqr' ||
    order.paymentStatus === 'paid'
  ) return;
  try {
    localStorage.setItem(
      pendingCustomerOrderKey(order.customerUid),
      order.orderNumber
    );
  } catch (error) {
    console.warn('Could not persist the pending customer order ID.', error);
  }
}

function clearPendingCustomerOrderIfResolved(order: Order): void {
  if (!order.customerUid) return;
  if (
    order.paymentStatus !== 'paid' &&
    order.orderStatus !== 'Hoàn tất' &&
    order.orderStatus !== 'Đã hủy'
  ) {
    return;
  }
  try {
    if (
      readPendingCustomerOrderNumber(order.customerUid) === order.orderNumber
    ) {
      localStorage.removeItem(pendingCustomerOrderKey(order.customerUid));
    }
  } catch (error) {
    console.warn('Could not clear the resolved customer order ID.', error);
  }
}

function saveLocalOrder(order: Order): void {
  writeLocalOrders([
    order,
    ...readLocalOrders().filter(
      (cachedOrder) => cachedOrder.orderNumber !== order.orderNumber
    ),
  ]);
}

function isCachedProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const product = value as Record<string, unknown>;
  return (
    typeof product.id === 'string' &&
    typeof product.sku === 'string' &&
    typeof product.name === 'string' &&
    typeof product.category === 'string' &&
    typeof product.village === 'string' &&
    typeof product.material === 'string' &&
    typeof product.price === 'number' &&
    typeof product.image === 'string' &&
    typeof product.shortDesc === 'string' &&
    typeof product.story === 'string' &&
    typeof product.dimensions === 'string' &&
    typeof product.careGuide === 'string' &&
    typeof product.artisanName === 'string' &&
    typeof product.craftDays === 'number' &&
    typeof product.rating === 'number' &&
    typeof product.reviewCount === 'number' &&
    typeof product.availabilityTag === 'string' &&
    typeof product.inStock === 'boolean' &&
    typeof product.featuredRank === 'number' &&
    Array.isArray(product.keywords) &&
    Array.isArray(product.variants)
  );
}

export function readCachedStoreProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return null;

    const cached: unknown = JSON.parse(raw);
    if (!Array.isArray(cached) || !cached.every(isCachedProduct)) {
      localStorage.removeItem(PRODUCTS_STORAGE_KEY);
      console.warn('Ignoring an invalid cached product list.');
      return null;
    }

    return sortProducts(cached);
  } catch (error) {
    console.warn('Could not read cached products; loading from Firestore.', error);
    return null;
  }
}

export function writeCachedStoreProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.warn('Could not persist the product cache.', error);
  }
}

export function getStorageBackendMode(): StorageBackendMode {
  return isFirebaseConfigured() ? 'firebase' : 'localhost';
}

function readLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : INITIAL_ORDERS;
  } catch {
    return INITIAL_ORDERS;
  }
}

function writeLocalOrders(items: Order[]): void {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function sortProducts(products: Product[]): Product[] {
  return products.sort(
    (a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99)
  );
}

function sortOrders(orders: Order[]): Order[] {
  return orders.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export async function fetchStoreProducts(): Promise<Product[]> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firebase Firestore chưa được cấu hình.');
  }

  const snapshot = await getDocsFromServer(collection(db, 'products'));
  const products = sortProducts(
    snapshot.docs.map((item) => item.data() as Product)
  );
  writeCachedStoreProducts(products);
  return products;
}

export async function initializeAdminProducts(): Promise<Product[]> {
  return fetchStoreProducts();
}

export async function saveStoreProduct(product: Product): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firebase Firestore chưa được cấu hình.');
  }
  await setDoc(doc(db, 'products', product.id), product);
}

export async function deleteStoreProduct(productId: string): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firebase Firestore chưa được cấu hình.');
  }
  await deleteDoc(doc(db, 'products', productId));
}

export async function fetchCustomerOrders(customerUid: string): Promise<Order[]> {
  const db = getFirestoreInstance();
  if (!db) {
    return sortOrders(
      readLocalOrders().filter((order) => order.customerUid === customerUid)
    );
  }

  const orderNumbers = getKnownCustomerOrderIds(customerUid);
  const snapshots = await Promise.all(
    orderNumbers.map((orderNumber) =>
      getDoc(doc(db, 'orders', orderNumber))
    )
  );
  return sortOrders(
    snapshots
      .filter(
        (snapshot) =>
          snapshot.exists() && snapshot.data().customerUid === customerUid
      )
      .map((snapshot) => snapshot.data() as Order)
  );
}

export function observeCustomerOrders(
  customerUid: string,
  onOrders: (orders: Order[]) => void,
  onError: (error: Error) => void
): () => void {
  const db = getFirestoreInstance();
  if (!db) {
    onOrders(
      sortOrders(
        readLocalOrders().filter((order) => order.customerUid === customerUid)
      )
    );
    return () => {};
  }

  const ordersByNumber = new Map<string, Order>();
  const subscriptions = new Map<string, () => void>();
  const emitOrders = () => onOrders(sortOrders([...ordersByNumber.values()]));
  const subscribeToOrder = (orderNumber: string) => {
    if (subscriptions.has(orderNumber)) return;
    subscriptions.set(
      orderNumber,
      onSnapshot(
        doc(db, 'orders', orderNumber),
        (snapshot) => {
          if (!snapshot.exists() || snapshot.data().customerUid !== customerUid) {
            ordersByNumber.delete(orderNumber);
            emitOrders();
            return;
          }
          const order = snapshot.data() as Order;
          ordersByNumber.set(orderNumber, order);
          saveLocalOrder(order);
          clearPendingCustomerOrderIfResolved(order);
          emitOrders();
        },
        onError
      )
    );
  };
  const observerSet = customerOrderObservers.get(customerUid) ?? new Set();
  observerSet.add(subscribeToOrder);
  customerOrderObservers.set(customerUid, observerSet);
  getKnownCustomerOrderIds(customerUid).forEach(subscribeToOrder);
  emitOrders();
  return () => {
    observerSet.delete(subscribeToOrder);
    if (observerSet.size === 0) customerOrderObservers.delete(customerUid);
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
}

export async function fetchAdminOrders(): Promise<Order[]> {
  const db = getFirestoreInstance();
  if (!db) return readLocalOrders();

  const snapshot = await getDocs(collection(db, 'orders'));
  const orders = sortOrders(snapshot.docs.map((item) => item.data() as Order));
  writeLocalOrders(orders);
  return orders;
}

export function observeAdminOrders(
  onOrders: (orders: Order[]) => void,
  onError: (error: Error) => void
): () => void {
  const db = getFirestoreInstance();
  if (!db) {
    onOrders(readLocalOrders());
    return () => {};
  }

  return onSnapshot(
    collection(db, 'orders'),
    (snapshot) => {
      const orders = sortOrders(snapshot.docs.map((item) => item.data() as Order));
      writeLocalOrders(orders);
      onOrders(orders);
    },
    onError
  );
}

export async function createStoreOrder(order: Order): Promise<Order> {
  if (!order.customerUid) {
    throw new Error('Vui lòng đăng nhập tài khoản khách hàng trước khi đặt đơn.');
  }

  const functions = getFirebaseFunctionsInstance();
  if (!functions) {
    if (getFirestoreInstance()) {
      throw new Error('Dịch vụ tạo đơn Firebase chưa được cấu hình.');
    }
    writeLocalOrders([order, ...readLocalOrders()]);
    rememberCustomerOrderId(order.customerUid, order.orderNumber);
    rememberPendingCustomerOrder(order);
    return order;
  }

  const orderInput = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    ...(order.promoCode ? { promoCode: order.promoCode } : {}),
    items: order.items.map(({ productId, variantId, quantity }) => ({
      productId,
      variantId,
      quantity,
    })),
  };
  const createCustomerOrder = httpsCallable<typeof orderInput, Order>(
    functions,
    'createCustomerOrder'
  );
  const { data: savedOrder } = await createCustomerOrder(orderInput);

  saveLocalOrder(savedOrder);
  if (!savedOrder.customerUid) {
    throw new Error('Đơn hàng trả về không có mã tài khoản khách hàng.');
  }
  rememberCustomerOrderId(savedOrder.customerUid, savedOrder.orderNumber);
  rememberPendingCustomerOrder(savedOrder);
  return savedOrder;
}

export async function submitCustomerOrderPayment(
  orderNumber: string
): Promise<void> {
  const db = getFirestoreInstance();
  if (db) {
    await updateDoc(doc(db, 'orders', orderNumber), {
      paymentStatus: 'awaiting_confirmation',
      paymentSubmittedAt: new Date().toISOString(),
    });
  }
  const order = readLocalOrders().find(
    (cachedOrder) => cachedOrder.orderNumber === orderNumber
  );
  if (order) saveLocalOrder({ ...order, paymentStatus: 'awaiting_confirmation' });
}

export async function updateStoreOrderStatus(
  orderNumber: string,
  orderStatus: OrderStatus
): Promise<void> {
  const db = getFirestoreInstance();
  if (db) {
    await updateDoc(doc(db, 'orders', orderNumber), { orderStatus });
  }

  writeLocalOrders(
    readLocalOrders().map((order) =>
      order.orderNumber === orderNumber ? { ...order, orderStatus } : order
    )
  );
}

export async function confirmStoreOrderPayment(
  orderNumber: string,
  received: boolean,
  note?: string
): Promise<void> {
  const functions = getFirebaseFunctionsInstance();
  if (!functions) {
    if (getFirestoreInstance()) {
      throw new Error('Dịch vụ xác nhận thanh toán Firebase chưa được cấu hình.');
    }
    const order = readLocalOrders().find(
      (cachedOrder) => cachedOrder.orderNumber === orderNumber
    );
    if (!order) throw new Error('Không tìm thấy đơn hàng cần cập nhật.');
    const paymentStatus = received ? 'paid' : 'pending_payment';
    saveLocalOrder({
      ...order,
      paymentStatus,
      ...(received ? { paymentNote: undefined } : { paymentNote: note }),
    });
    return;
  }

  const confirmPayment = httpsCallable<
    { orderNumber: string; received: boolean; note?: string },
    { orderNumber: string; paymentStatus: Order['paymentStatus'] }
  >(functions, 'confirmCustomerOrderPayment');
  const { data } = await confirmPayment({
    orderNumber,
    received,
    ...(note ? { note } : {}),
  });
  const order = readLocalOrders().find(
    (cachedOrder) => cachedOrder.orderNumber === orderNumber
  );
  if (order) {
    saveLocalOrder({
      ...order,
      paymentStatus: data.paymentStatus,
      ...(received ? { paymentNote: undefined } : { paymentNote: note }),
    });
  }
}
