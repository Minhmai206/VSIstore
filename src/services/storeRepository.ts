import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { INITIAL_ORDERS } from '../data/products';
import { Order, OrderStatus, Product } from '../types/shop';
import { getFirestoreInstance, isFirebaseConfigured } from './firebaseConfig';

const ORDERS_STORAGE_KEY = 'moc_dat_orders_v1';
export type StorageBackendMode = 'firebase' | 'localhost';

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

  const snapshot = await getDocs(collection(db, 'products'));
  return sortProducts(snapshot.docs.map((item) => item.data() as Product));
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

  const ordersQuery = query(
    collection(db, 'orders'),
    where('customerUid', '==', customerUid)
  );
  const snapshot = await getDocs(ordersQuery);
  return sortOrders(snapshot.docs.map((item) => item.data() as Order));
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

  const ordersQuery = query(
    collection(db, 'orders'),
    where('customerUid', '==', customerUid)
  );
  return onSnapshot(
    ordersQuery,
    (snapshot) =>
      onOrders(sortOrders(snapshot.docs.map((item) => item.data() as Order))),
    onError
  );
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

  const db = getFirestoreInstance();
  let savedOrder = order;
  if (db) await setDoc(doc(db, 'orders', order.orderNumber), order);

  writeLocalOrders([savedOrder, ...readLocalOrders()]);
  return savedOrder;
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
  orderNumber: string
): Promise<void> {
  const paymentStatus = 'Đã xác nhận chuyển khoản' as const;
  const db = getFirestoreInstance();
  if (db) {
    await updateDoc(doc(db, 'orders', orderNumber), { paymentStatus });
  }

  writeLocalOrders(
    readLocalOrders().map((order) =>
      order.orderNumber === orderNumber ? { ...order, paymentStatus } : order
    )
  );
}
