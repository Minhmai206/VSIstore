/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import {
  CartCheckoutDrawer,
  DrawerStep,
} from './components/CartCheckoutDrawer';
import { CollectionBanners } from './components/CollectionBanners';
import { CraftsmanshipSection } from './components/CraftsmanshipSection';
import { CustomerAccountModal } from './components/CustomerAccountModal';
import { FloatingWidgets } from './components/FloatingWidgets';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SmartCatalog } from './components/SmartCatalog';
import { TopBanner } from './components/TopBanner';
import { SITE_CONFIG } from './config/site';
import {
  confirmStoreOrderPayment,
  createStoreOrder,
  deleteStoreProduct,
  fetchAdminOrders,
  fetchCustomerOrders,
  fetchStoreProducts,
  initializeAdminProducts,
  observeAdminOrders,
  observeCustomerOrders,
  saveStoreProduct,
  updateStoreOrderStatus,
} from './services/storeRepository';
import {
  CustomerProfile,
  observeCustomerSession,
  signOutCustomer,
} from './services/customerRepository';
import { initializeFirebaseAnalytics } from './services/firebaseConfig';
import {
  CartItem,
  CraftCategory,
  FilterState,
  Order,
  OrderStatus,
  Product,
} from './types/shop';

const CART_STORAGE_KEY = 'moc_dat_cart_v1';

const DEFAULT_FILTERS: FilterState = {
  query: '',
  category: 'Tất Cả',
  village: 'Tất cả ',
  material: 'Tất cả chất liệu',
  priceRange: 'all',
  maxPrice: Number.MAX_SAFE_INTEGER,
  inStockOnly: false,
  sortBy: 'featured',
};

export default function App() {
  const [view, setView] = useState<'store' | 'admin'>('store');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  const [bannerVisible, setBannerVisible] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<DrawerStep>('cart');
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
  const [productsReloadKey, setProductsReloadKey] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const observedCustomerOrders = useRef<{
    uid: string | null;
    states: Map<string, { paymentStatus: string; orderStatus: string }>;
  }>({ uid: null, states: new Map() });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  // Products are public; orders are loaded only after customer/admin authentication.
  useEffect(() => {
    let active = true;
    setProductsLoading(true);
    setProductsLoadError(null);
    void fetchStoreProducts()
      .then((loadedProducts) => {
        if (active) setProducts(loadedProducts);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Không thể tải sản phẩm:', error);
        setProducts([]);
        setProductsLoadError(
          error instanceof Error
            ? error.message
            : 'Vui lòng kiểm tra kết nối và quyền đọc Firestore.'
        );
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productsReloadKey]);

  useEffect(() => {
    return observeCustomerSession(
      (profile) => {
        setCustomer(profile);
        if (!profile) setOrders([]);
      },
      (error) => console.error('Không thể tải hồ sơ khách hàng:', error)
    );
  }, []);

  const activeCustomerUid = customer?.uid;
  useEffect(() => {
    if (!activeCustomerUid) {
      setOrders([]);
      return;
    }
    return observeCustomerOrders(
      activeCustomerUid,
      setOrders,
      (error) => console.error('Không thể cập nhật đơn hàng khách hàng:', error)
    );
  }, [activeCustomerUid]);

  useEffect(() => {
    if (!adminUnlocked || view !== 'admin') return;
    return observeAdminOrders(
      setAdminOrders,
      (error) => console.error('Không thể cập nhật đơn hàng quản trị:', error)
    );
  }, [adminUnlocked, view]);

  useEffect(() => {
    if (!customer) {
      observedCustomerOrders.current = { uid: null, states: new Map() };
      return;
    }

    if (observedCustomerOrders.current.uid !== customer.uid) {
      const initialStates = new Map(
        orders
          .filter((order) => order.customerUid === customer.uid)
          .map((order) => [
            order.orderNumber,
            {
              paymentStatus: order.paymentStatus,
              orderStatus: order.orderStatus,
            },
          ])
      );
      observedCustomerOrders.current = {
        uid: customer.uid,
        states: initialStates,
      };
      return;
    }

    let notice: string | null = null;
    const previousStates = observedCustomerOrders.current.states;
    const nextStates = new Map<string, { paymentStatus: string; orderStatus: string }>();
    for (const order of orders) {
      if (order.customerUid !== customer.uid) continue;
      const previous = previousStates.get(order.orderNumber);
      if (previous && previous.paymentStatus !== order.paymentStatus) {
        if (order.paymentStatus === 'Đã xác nhận chuyển khoản') {
          notice = `${SITE_CONFIG.brandName} · Đơn #${order.orderNumber}: quản trị viên đã xác nhận thanh toán.`;
        }
      } else if (previous && previous.orderStatus !== order.orderStatus) {
        notice = `${SITE_CONFIG.brandName} · Đơn #${order.orderNumber} cập nhật: ${order.orderStatus}.`;
      }
      nextStates.set(order.orderNumber, {
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      });
    }
    observedCustomerOrders.current.states = nextStates;
    if (notice) setOrderNotice(notice);
  }, [customer, orders]);

  useEffect(() => {
    if (!orderNotice) return;
    const timeoutId = window.setTimeout(() => setOrderNotice(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [orderNotice]);

  useEffect(() => {
    let active = true;
    void initializeFirebaseAnalytics().catch((error: unknown) => {
      if (active) console.error('Không thể khởi tạo Firebase Analytics:', error);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    if (!selectedProduct) return;
    const latestProduct = products.find((product) => product.id === selectedProduct.id);
    if (latestProduct && latestProduct !== selectedProduct) {
      setSelectedProduct(latestProduct);
    }
  }, [products, selectedProduct]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const footerCategories = useMemo(
    () =>
      SITE_CONFIG.footerCategories.filter((category) =>
        products.some((product) => product.category === category)
      ),
    [products]
  );

  const handleUpdateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleAddToCart = (
    product: Product,
    variantId: string,
    quantity: number = 1
  ) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variantId === variantId
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.variantId === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { productId: product.id, variantId, quantity }];
    });
  };

  const handleBuyNow = (
    product: Product,
    variantId: string,
    quantity: number
  ) => {
    handleAddToCart(product, variantId, quantity);
    setSelectedProduct(null);
    setDrawerStep('checkout');
    setDrawerOpen(true);
  };

  const handleUpdateQuantity = (
    productId: string,
    variantId: string,
    delta: number
  ) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (productId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      )
    );
  };

  const handleCompleteOrder = async (order: Order): Promise<Order> => {
    const savedOrder = await createStoreOrder(order);
    setOrders((prev) => [savedOrder, ...prev]);
    setCart([]);
    return savedOrder;
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    await saveStoreProduct(updatedProduct);
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === updatedProduct.id);
      if (exists) {
        return prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      }
      return [updatedProduct, ...prev];
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteStoreProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleUpdateOrderStatus = async (
    orderNumber: string,
    status: OrderStatus
  ) => {
    await updateStoreOrderStatus(orderNumber, status);
    setAdminOrders((prev) =>
      prev.map((order) =>
        order.orderNumber === orderNumber
          ? { ...order, orderStatus: status }
          : order
      )
    );
  };

  const handleConfirmOrderPayment = async (orderNumber: string) => {
    await confirmStoreOrderPayment(orderNumber);
    setAdminOrders((prev) =>
      prev.map((order) =>
        order.orderNumber === orderNumber
          ? { ...order, paymentStatus: 'Đã xác nhận chuyển khoản' }
          : order
      )
    );
  };

  const handleAdminAuthenticated = async () => {
    try {
      const [loadedProducts, loadedOrders] = await Promise.all([
          initializeAdminProducts(),
          fetchAdminOrders(),
      ]);
      setProducts(loadedProducts);
      setAdminOrders(loadedOrders);
      setAdminUnlocked(true);
      setAccountModalOpen(false);
      setView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      await signOutCustomer();
      throw error;
    }
  };

  const handleAdminExit = async () => {
    await signOutCustomer();
    setAdminUnlocked(false);
    setOrders([]);
    setAdminOrders([]);
    setView('store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreCollection = () => {
    const section = document.getElementById('san-pham');
    section?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectCategoryFromFooter = (category: CraftCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleOpenOrders = () => {
    if (!customer) {
      setAccountModalOpen(true);
      return;
    }
    setOrdersModalOpen(true);
  };

  const customerOrders = useMemo(
    () => (customer ? orders.filter((order) => order.customerUid === customer.uid) : []),
    [customer, orders]
  );

  if (view === 'admin' && adminUnlocked) {
    return (
      <AdminDashboard
        products={products}
        orders={adminOrders}
        onBackToStore={() => {
          void handleAdminExit();
        }}
        onLockAdmin={() => {
          void handleAdminExit();
        }}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onConfirmOrderPayment={handleConfirmOrderPayment}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#2B2018]">
      <TopBanner
        visible={bannerVisible}
        onDismiss={() => setBannerVisible(false)}
        onActionClick={handleExploreCollection}
      />

      <Header
        cartCount={cartCount}
        searchQuery={filters.query}
        products={products}
        onSearchChange={(value) => handleUpdateFilters({ query: value })}
        onSelectProduct={(product) => setSelectedProduct(product)}
        onSearchSubmit={handleExploreCollection}
        onOpenCart={() => {
          setDrawerStep('cart');
          setDrawerOpen(true);
        }}
        onOpenAccount={() => setAccountModalOpen(true)}
        onOpenOrders={handleOpenOrders}
      />

      <main className="flex-1">
        <Hero onExploreClick={handleExploreCollection} />
        <CollectionBanners />

        <SmartCatalog
          products={products}
          productsLoading={productsLoading}
          productsLoadError={productsLoadError}
          filters={filters}
          onRetryProducts={() => setProductsReloadKey((key) => key + 1)}
          onUpdateFilters={handleUpdateFilters}
          onResetFilters={handleResetFilters}
          onSelectProduct={(product) => setSelectedProduct(product)}
          onQuickAdd={(product, variantId) =>
            handleAddToCart(product, variantId, 1)
          }
          searchInputRef={searchInputRef}
        />

        <CraftsmanshipSection />
      </main>

      <Footer
        categories={footerCategories}
        onSelectCategory={handleSelectCategoryFromFooter}
        onOpenOrders={handleOpenOrders}
      />

      <FloatingWidgets />

      {orderNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-4 z-[70] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-[#D7C8B2] bg-[#FCF9F5] p-4 text-sm text-[#2B2018] shadow-xl sm:left-auto sm:right-5 sm:max-w-sm"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3F5E3B]" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{orderNotice}</p>
            <button
              type="button"
              onClick={() => {
                setOrderNotice(null);
                setOrdersModalOpen(true);
              }}
              className="mt-1 text-xs font-semibold text-[#073D63] underline underline-offset-2"
            >
              Xem trạng thái đơn hàng
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOrderNotice(null)}
            aria-label="Đóng thông báo"
            className="rounded p-1 text-[#867363] hover:bg-[#EFE8DD]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <CustomerAccountModal
        isOpen={accountModalOpen}
        customer={customer}
        onClose={() => setAccountModalOpen(false)}
        onCustomerAuthenticated={async (profile) => {
          const loadedOrders = await fetchCustomerOrders(profile.uid);
          setCustomer(profile);
          setOrders(loadedOrders);
          setAccountModalOpen(false);
        }}
        onOpenOrders={() => {
          setAccountModalOpen(false);
          setOrdersModalOpen(true);
        }}
        onSignOut={async () => {
          await signOutCustomer();
          setCustomer(null);
          setOrders([]);
        }}
        onAdminAuthenticated={handleAdminAuthenticated}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <CartCheckoutDrawer
        isOpen={drawerOpen}
        step={drawerStep}
        onChangeStep={setDrawerStep}
        onClose={() => setDrawerOpen(false)}
        products={products}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCompleteOrder={handleCompleteOrder}
        onOpenOrderHistory={handleOpenOrders}
        onOpenAccount={() => setAccountModalOpen(true)}
        customer={customer}
        customerOrders={orders}
      />

      <OrderHistoryModal
        isOpen={ordersModalOpen}
        orders={customerOrders}
        onClose={() => setOrdersModalOpen(false)}
      />
    </div>
  );
}
