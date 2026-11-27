export type CraftCategory =
  | 'Tất Cả'
  | 'Gốm Sứ'
  | 'Mây Tre Đan'
  | 'Gỗ Mỹ Nghệ'
  | 'Sơn Mài'
  | 'Dệt Thổ Cẩm'
  | 'Cắt Gọt & Chạm Khắc'
  | 'Mây Móc & Dệt Thủ Công'
  | 'Gỗ'
  | 'Công cụ máy móc'
  | 'Bộ kit'
  | '...';

export type PriceRangeKey = 'all' | 'under-500' | '500-1500' | 'over-1500';

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'rating-desc'
  | 'newest';

export interface ProductVariant {
  id: string;
  label: string;
  colorHex: string;
  priceDelta: number;
  stock: number;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Exclude<CraftCategory, 'Tất Cả'>;
  village: string;
  material: string;
  price: number;
  originalPrice?: number;
  image: string;
  galleryImages?: string[];
  shortDesc: string;
  story: string;
  dimensions: string;
  weight?: string;
  specifications?: ProductSpecification[];
  careGuide: string;
  artisanName: string;
  craftDays: number;
  rating: number;
  reviewCount: number;
  availabilityTag: 'Còn hàng' | 'Phiên bản giới hạn' | 'Tạm hết hàng';
  inStock: boolean;
  isNew?: boolean;
  featuredRank: number;
  keywords: string[];
  variants: ProductVariant[];
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface FilterState {
  query: string;
  category: CraftCategory;
  village: string;
  material: string;
  priceRange: PriceRangeKey;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: SortOption;
}

export type ShippingMethod = 'standard' | 'express';

export type PaymentMethod = 'vietqr' | 'card' | 'ewallet' | 'cod';

export type EWalletProvider = 'momo' | 'vnpay';

export interface CheckoutForm {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  note: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  ewalletProvider: EWalletProvider;
  cardNumber: string;
  cardHolder: string;
  cardExpiry: string;
  cardCvv: string;
}

export interface OrderItemSnapshot {
  productId: string;
  variantId?: string;
  name: string;
  category?: Exclude<CraftCategory, 'Tất Cả'>;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  image: string;
}

export type OrderStatus =
  | 'Chờ xác nhận'
  | 'Đang đóng gói chống sốc'
  | 'Đang giao hàng'
  | 'Hoàn tất'
  | 'Đã hủy';

export type PaymentStatus =
  | 'pending_payment'
  | 'awaiting_confirmation'
  | 'paid'
  | 'Đã thanh toán trực tuyến'
  | 'Đã xác nhận chuyển khoản'
  | 'Chờ xác nhận thanh toán'
  | 'Thanh toán khi nhận hàng';

export interface Order {
  orderNumber: string;
  customerUid?: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  ewalletProvider?: EWalletProvider;
  paymentReference?: string;
  paymentSubmittedAt?: string;
  paymentConfirmedAt?: string;
  paymentNote?: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus | string;
  estimatedDelivery: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  promoCode?: string;
  items: OrderItemSnapshot[];
}

export interface CraftReview {
  id: string;
  author: string;
  role: string;
  location: string;
  productPurchased: string;
  quote: string;
}
