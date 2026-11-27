import { SyntheticEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Database,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  Lock,
  Package,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  Upload,
  X,
} from 'lucide-react';
import {
  CRAFT_CATEGORIES,
  CRAFT_VILLAGES,
  MATERIALS_LIST,
  STUDIO_IMAGE_PRESETS,
} from '../data/products';
import { SITE_CONFIG } from '../config/site';
import { getStorageBackendMode } from '../services/storeRepository';
import {
  Order,
  OrderStatus,
  Product,
  ProductSpecification,
  ProductVariant,
} from '../types/shop';
import {
  formatAddressWithCity,
  formatOrderDate,
  formatVND,
  removeVietnameseDiacritics,
} from '../utils/format';
import { ResilientImage } from './ResilientImage';

type AdminTab = 'overview' | 'products' | 'orders' | 'customers' | 'settings';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  onBackToStore: () => void;
  onLockAdmin: () => void;
  onSaveProduct: (product: Product) => Promise<void> | void;
  onDeleteProduct: (productId: string) => Promise<void> | void;
  onUpdateOrderStatus: (
    orderNumber: string,
    status: OrderStatus
  ) => Promise<void> | void;
  onConfirmOrderPayment: (
    orderNumber: string,
    received: boolean,
    note?: string
  ) => Promise<void> | void;
  onApproveOrder: (orderNumber: string) => Promise<Order>;
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Chờ duyệt giá và tồn kho',
  'Chờ xác nhận',
  'Đang đóng gói chống sốc',
  'Đang giao hàng',
  'Hoàn tất',
  'Đã hủy',
];

interface DetailedProductFormState {
  id: string;
  sku: string;
  name: string;
  category: Product['category'];
  village: string;
  material: string;
  price: number;
  originalPrice: number;
  craftDays: number;
  dimensions: string;
  weight: string;
  artisanName: string;
  specifications: ProductSpecification[];
  shortDesc: string;
  story: string;
  careGuide: string;
  keywordsText: string;
  image: string;
  galleryImages: string[];
  availabilityTag: Product['availabilityTag'];
  isNew: boolean;
  variants: ProductVariant[];
}

function createEmptyProductForm(nextIndex: number): DetailedProductFormState {
  return {
    id: '',
    sku: `MD-SP-${String(nextIndex).padStart(2, '0')}`,
    name: '',
    category: 'Cắt Gọt & Chạm Khắc',
    village: 'Hà Nội',
    material: 'Đ & M',
    price: 750000,
    originalPrice: 0,
    craftDays: 10,
    dimensions: '',
    weight: '',
    artisanName: '',
    specifications: [],
    shortDesc: '',
    story: '',
    careGuide: 'Lau nhẹ bằng khăn mềm ẩm, tránh va đập mạnh và hóa chất tẩy.',
    keywordsText: 'gom su, bat trang, thu cong, nau be, qua tang',
    image: STUDIO_IMAGE_PRESETS[0].url,
    galleryImages: [STUDIO_IMAGE_PRESETS[0].url],
    availabilityTag: 'Còn hàng',
    isNew: true,
    variants: [
      {
        id: 'tieu-chuan',
        label: 'Phiên bản tiêu chuẩn',
        colorHex: '#073D63',
        priceDelta: 0,
        stock: 10,
      },
    ],
  };
}

/**
 * Chuẩn hóa ảnh vào khung 4:3 ở độ phân giải HD/Retina, giữ nguyên toàn bộ
 * nội dung ảnh và chỉ thêm nền đệm khi tỷ lệ gốc khác khung sản phẩm.
 */
function optimizeLocalImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh từ máy tính.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        // Khung sản phẩm chuẩn 1600x1200 (4:3), vừa Retina vừa tránh méo hoặc cắt ảnh.
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        const sourceWidth = img.naturalWidth || img.width;
        const sourceHeight = img.naturalHeight || img.height;

        // Bật nội suy chất lượng cao nhất của trình duyệt để ảnh sau khi resize không bị mờ/răng cưa
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Nền kem đồng bộ giao diện cho phần đệm hoặc ảnh PNG trong suốt.
        ctx.fillStyle = '#EFE8DD';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Fit contain: giữ nguyên tỷ lệ gốc, không cắt mép, đặt ảnh cân giữa khung.
        const scale = Math.min(
          canvas.width / sourceWidth,
          canvas.height / sourceHeight
        );
        const drawWidth = Math.round(sourceWidth * scale);
        const drawHeight = Math.round(sourceHeight * scale);
        const offsetX = Math.round((canvas.width - drawWidth) / 2);
        const offsetY = Math.round((canvas.height - drawHeight) / 2);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Ưu tiên WebP chất lượng 0.92 (sắc nét hơn và nhẹ hơn JPEG), fallback sang JPEG 0.92
        const webpUrl = canvas.toDataURL('image/webp', 0.92);
        if (webpUrl.startsWith('data:image/webp')) {
          resolve(webpUrl);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function AdminDashboard({
  products,
  orders,
  onBackToStore,
  onLockAdmin,
  onSaveProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onConfirmOrderPayment,
  onApproveOrder,
}: AdminDashboardProps) {
  const fieldId = useId().replace(/:/g, '');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [productQuery, setProductQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] =
    useState<string>('Tất Cả');
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('Tất cả');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PAGE_SIZE = 20;

  const [editingProductModalOpen, setEditingProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<DetailedProductFormState>(() =>
    createEmptyProductForm(products.length + 1)
  );
  const [productFormError, setProductFormError] = useState('');
  const [productActionError, setProductActionError] = useState('');
  const [orderActionError, setOrderActionError] = useState('');
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [approvingOrder, setApprovingOrder] = useState(false);
  const [paymentRejectionNote, setPaymentRejectionNote] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);

  // Settings tab state
  const storageMode = getStorageBackendMode();

  const metrics = useMemo(() => {
    const validOrders = orders.filter(
      (order) =>
        order.orderStatus !== 'Đã hủy' &&
        order.paymentStatus !== 'awaiting_admin_review'
    );
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue =
      validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;
    const totalStockUnits = products.reduce(
      (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.stock, 0),
      0
    );

    const productRevenue: Record<'Bộ kit' | 'Máy móc', number> = {
      'Bộ kit': 0,
      'Máy móc': 0,
    };
    for (const order of validOrders) {
      for (const item of order.items) {
        const prod = products.find((p) => p.id === item.productId);
        const category: string | undefined = prod?.category ?? item.category;
        const revenueRow =
          category === 'Bộ kit'
            ? 'Bộ kit'
            : category === 'Công cụ máy móc' || category === 'Máy móc'
              ? 'Máy móc'
              : null;
        if (revenueRow) {
          productRevenue[revenueRow] += item.unitPrice * item.quantity;
        }
      }
    }

    const maxProductRevenue = Math.max(1, ...Object.values(productRevenue));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalStockUnits,
      productRevenue,
      maxProductRevenue,
    };
  }, [orders, products]);

  const filteredProducts = useMemo(() => {
    const q = removeVietnameseDiacritics(productQuery);
    return products.filter((p) => {
      if (
        productCategoryFilter !== 'Tất Cả' &&
        p.category !== productCategoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      const hay = removeVietnameseDiacritics(
        `${p.name} ${p.sku} ${p.village} ${p.material} ${p.category}`
      );
      return hay.includes(q);
    });
  }, [products, productQuery, productCategoryFilter]);

  const filteredOrders = useMemo(() => {
    const q = removeVietnameseDiacritics(orderQuery);
    return orders.filter((o) => {
      if (orderStatusFilter !== 'Tất cả' && o.orderStatus !== orderStatusFilter) {
        return false;
      }
      if (orderDateFrom) {
        const createdDate = o.createdAt.slice(0, 10);
        if (createdDate < orderDateFrom) return false;
      }
      if (orderDateTo) {
        const createdDate = o.createdAt.slice(0, 10);
        if (createdDate > orderDateTo) return false;
      }
      if (!q) return true;
      const hay = removeVietnameseDiacritics(
        `${o.orderNumber} ${o.customerName} ${o.phone} ${o.city}`
      );
      return hay.includes(q);
    });
  }, [orders, orderQuery, orderStatusFilter, orderDateFrom, orderDateTo]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderQuery, orderStatusFilter, orderDateFrom, orderDateTo]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDERS_PAGE_SIZE;
    return filteredOrders.slice(start, start + ORDERS_PAGE_SIZE);
  }, [filteredOrders, orderPage]);
  const totalOrderPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE)
  );
  const customers = useMemo(() => {
    const grouped = new Map<
      string,
      { key: string; name: string; phone: string; email: string; orders: number; total: number }
    >();
    for (const order of orders) {
      const key =
        order.email.trim().toLowerCase() ||
        order.phone.replace(/\s+/g, '');
      if (!key) continue;
      const current = grouped.get(key);
      if (current) {
        current.orders += 1;
        current.total += order.total;
      } else {
        grouped.set(key, {
          key,
          name: order.customerName,
          phone: order.phone,
          email: order.email,
          orders: 1,
          total: order.total,
        });
      }
    }
    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }, [orders]);

  const openCreateProduct = () => {
    setProductForm(createEmptyProductForm(products.length + 1));
    setProductFormError('');
    setProductActionError('');
    setEditingProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    const gallery = Array.from(
      new Set([product.image, ...(product.galleryImages ?? [])].filter(Boolean))
    );
    setProductForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      village: product.village,
      material: product.material,
      price: product.price,
      originalPrice: product.originalPrice ?? 0,
      craftDays: product.craftDays,
      dimensions: product.dimensions,
      weight: product.weight ?? '',
      artisanName: product.artisanName,
      specifications: product.specifications ?? [],
      shortDesc: product.shortDesc,
      story: product.story,
      careGuide: product.careGuide,
      keywordsText: product.keywords.join(', '),
      image: product.image,
      galleryImages: gallery,
      availabilityTag: product.availabilityTag,
      isNew: Boolean(product.isNew),
      variants:
        product.variants.length > 0
          ? product.variants.map((v) => ({ ...v }))
          : [
              {
                id: 'tieu-chuan',
                label: 'Phiên bản tiêu chuẩn',
                colorHex: '#073D63',
                priceDelta: 0,
                stock: 10,
              },
            ],
    });
    setProductFormError('');
    setProductActionError('');
    setEditingProductModalOpen(true);
  };

  const handleDeleteProductClick = async (productId: string) => {
    setProductActionError('');
    try {
      await onDeleteProduct(productId);
    } catch (error) {
      setProductActionError(
        error instanceof Error
          ? `Không thể xóa sản phẩm: ${error.message}`
          : 'Không thể xóa sản phẩm. Vui lòng thử lại.'
      );
    }
  };

  const handleOrderStatusChange = async (
    orderNumber: string,
    status: OrderStatus
  ) => {
    setOrderActionError('');
    try {
      await onUpdateOrderStatus(orderNumber, status);
    } catch (error) {
      setOrderActionError(
        error instanceof Error
          ? `Không thể cập nhật đơn hàng: ${error.message}`
          : 'Không thể cập nhật đơn hàng. Vui lòng thử lại.'
      );
    }
  };

  const handleConfirmOrderPayment = async (
    orderNumber: string,
    received: boolean
  ) => {
    setOrderActionError('');
    setPaymentConfirming(true);
    try {
      await onConfirmOrderPayment(
        orderNumber,
        received,
        received ? undefined : paymentRejectionNote
      );
      setInspectingOrder((current) =>
        current
          ? {
              ...current,
              paymentStatus: received ? 'paid' : 'pending_payment',
              ...(received ? {} : { paymentNote: paymentRejectionNote }),
            }
          : current
      );
      setPaymentRejectionNote('');
    } catch (error) {
      setOrderActionError(
        error instanceof Error
          ? `Không thể xác nhận thanh toán: ${error.message}`
          : 'Không thể xác nhận thanh toán. Vui lòng thử lại.'
      );
    } finally {
      setPaymentConfirming(false);
    }
  };

  const handleApproveOrder = async (orderNumber: string) => {
    setOrderActionError('');
    setApprovingOrder(true);
    try {
      const approvedOrder = await onApproveOrder(orderNumber);
      setInspectingOrder(approvedOrder);
    } catch (error) {
      setOrderActionError(
        error instanceof Error
          ? `Không thể xác nhận giá và tồn kho: ${error.message}`
          : 'Không thể xác nhận giá và tồn kho. Vui lòng thử lại.'
      );
    } finally {
      setApprovingOrder(false);
    }
  };

  const handleLocalFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setProductFormError('');
    try {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imageFiles.length === 0) {
        setProductFormError('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
        return;
      }

      const optimizedImages = await Promise.all(
        imageFiles.slice(0, 6).map(optimizeLocalImageFile)
      );

      setProductForm((prev) => {
        const merged = Array.from(
          new Set([...prev.galleryImages, ...optimizedImages])
        );
        const isFirstUpload =
          prev.galleryImages.length === 1 &&
          STUDIO_IMAGE_PRESETS.some((p) => p.url === prev.image) &&
          !prev.id;

        return {
          ...prev,
          image: isFirstUpload ? optimizedImages[0] : prev.image || optimizedImages[0],
          galleryImages: isFirstUpload ? optimizedImages : merged,
        };
      });
    } catch {
      setProductFormError('Không thể đọc ảnh từ máy tính. Vui lòng thử tệp khác.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryImage = (url: string) => {
    setProductForm((prev) => {
      const remaining = prev.galleryImages.filter((item) => item !== url);
      const nextMain =
        prev.image === url
          ? remaining[0] || STUDIO_IMAGE_PRESETS[0].url
          : prev.image;
      return {
        ...prev,
        image: nextMain,
        galleryImages: remaining.length > 0 ? remaining : [nextMain],
      };
    });
  };

  const handleAddVariant = () => {
    setProductForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `phien-ban-${Date.now().toString().slice(-4)}`,
          label: `Phiên bản ${prev.variants.length + 1}`,
          colorHex: '#A67B5B',
          priceDelta: 0,
          stock: 5,
        },
      ],
    }));
  };

  const handleUpdateVariant = (
    idx: number,
    patch: Partial<ProductVariant>
  ) => {
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  };

  const handleRemoveVariant = (idx: number) => {
    setProductForm((prev) => {
      if (prev.variants.length <= 1) return prev;
      return {
        ...prev,
        variants: prev.variants.filter((_, i) => i !== idx),
      };
    });
  };

  const handleSaveProductSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      setProductFormError('Vui lòng nhập tên sản phẩm thủ công.');
      return;
    }
    if (productForm.price <= 0) {
      setProductFormError('Giá bán phải lớn hơn 0₫.');
      return;
    }
    if (productForm.variants.some((v) => !v.label.trim())) {
      setProductFormError('Mỗi phiên bản chế tác cần có tên mô tả.');
      return;
    }

    const existing = products.find((p) => p.id === productForm.id);
    const id =
      productForm.id ||
      `${removeVietnameseDiacritics(productForm.name).replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const totalStock = productForm.variants.reduce(
      (sum, v) => sum + Math.max(0, Number(v.stock) || 0),
      0
    );

    const parsedKeywords = productForm.keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const coverImage =
      productForm.image ||
      productForm.galleryImages[0] ||
      STUDIO_IMAGE_PRESETS[0].url;

    const cleanGallery = Array.from(
      new Set([coverImage, ...productForm.galleryImages].filter(Boolean))
    );
    const originalPrice = Number(productForm.originalPrice);
    const weight = productForm.weight.trim();

    const builtProduct: Product = {
      id,
      sku: productForm.sku.trim() || `MD-${Date.now().toString().slice(-4)}`,
      name: productForm.name.trim(),
      category: productForm.category,
      village: productForm.village.trim() || 'Bát Tràng',
      material: productForm.material.trim() || 'Thủ công truyền thống',
      price: Number(productForm.price),
      ...(originalPrice > Number(productForm.price) ? { originalPrice } : {}),
      image: coverImage,
      galleryImages: cleanGallery,
      shortDesc:
        productForm.shortDesc.trim() ||
        `Chế Tác Tại Xưởng${productForm.village} từ ${productForm.material.toLowerCase()}.`,
      story:
        productForm.story.trim(),
      dimensions: productForm.dimensions.trim(),
      ...(weight ? { weight } : {}),
      ...(productForm.specifications.some(
        ({ label, value }) => label.trim() && value.trim()
      )
        ? {
            specifications: productForm.specifications
              .map(({ label, value }) => ({
                label: label.trim(),
                value: value.trim(),
              }))
              .filter(({ label, value }) => label && value),
          }
        : {}),
      careGuide:
        productForm.careGuide.trim() ||
        'Lau nhẹ bằng khăn mềm, giữ nơi khô thoáng.',
      artisanName: productForm.artisanName.trim(),
      craftDays: Math.max(1, Number(productForm.craftDays) || 7),
      rating: existing?.rating ?? 5.0,
      reviewCount: existing?.reviewCount ?? 1,
      availabilityTag:
        totalStock === 0
          ? 'Tạm hết hàng'
          : productForm.availabilityTag === 'Tạm hết hàng'
            ? 'Còn hàng'
            : productForm.availabilityTag,
      inStock: totalStock > 0,
      isNew: productForm.isNew,
      featuredRank: existing?.featuredRank ?? products.length + 1,
      keywords:
        parsedKeywords.length > 0
          ? parsedKeywords
          : [productForm.name, productForm.category, productForm.village],
      variants: productForm.variants.map((v, index) => ({
        id: v.id || `var-${index + 1}`,
        label: v.label.trim(),
        colorHex: v.colorHex || '#073D63',
        priceDelta: Number(v.priceDelta) || 0,
        stock: Math.max(0, Number(v.stock) || 0),
      })),
    };

    try {
      await onSaveProduct(builtProduct);
      setEditingProductModalOpen(false);
    } catch (error) {
      setProductFormError(
        error instanceof Error
          ? `Không thể đồng bộ sản phẩm: ${error.message}`
          : 'Không thể đồng bộ sản phẩm. Vui lòng thử lại.'
      );
    }
  };

  const tabTitles: Record<AdminTab, string> = {
    overview: 'Tổng quan hoạt động',
    products: 'Quản lý sản phẩm chi tiết',
    orders: 'Đơn hàng & Thanh toán',
    customers: 'Danh sách khách hàng',
    settings: 'Cài đặt bảo mật & Firebase',
  };

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-[#2B2018] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-[#FCF9F5] border-b lg:border-b-0 lg:border-r border-[#E2D7C6] shrink-0 flex flex-col justify-between">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-lg font-bold tracking-tight text-[#2B2018]">
                {SITE_CONFIG.brandName}
              </p>
              <p className="text-xs text-[#867363] mt-0.5">
                {storageMode === 'firebase'
                  ? 'Dữ liệu: Firebase Firestore'
                  : 'Dữ liệu: Localhost (Tạm thời)'}
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToStore}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2D7C6] text-xs font-medium text-[#2B2018] hover:bg-[#EFE8DD] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về cửa hàng</span>
            </button>
          </div>

          <nav
            aria-label="Menu quản trị"
            className="flex lg:flex-col gap-1.5 overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#073D63] text-[#FCF9F5]'
                  : 'text-[#5E4B3C] hover:bg-[#EFE8DD] hover:text-[#2B2018]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng quan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#073D63] text-[#FCF9F5]'
                  : 'text-[#5E4B3C] hover:bg-[#EFE8DD] hover:text-[#2B2018]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="tabular-nums">Sản phẩm ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#073D63] text-[#FCF9F5]'
                  : 'text-[#5E4B3C] hover:bg-[#EFE8DD] hover:text-[#2B2018]'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="tabular-nums">
                Đơn hàng ({orders.length})
                {orders.some(
                  (order) => order.paymentStatus === 'awaiting_admin_review'
                ) &&
                  ` · cần duyệt ${orders.filter((order) => order.paymentStatus === 'awaiting_admin_review').length}`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#073D63] text-[#FCF9F5]'
                  : 'text-[#5E4B3C] hover:bg-[#EFE8DD] hover:text-[#2B2018]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="tabular-nums">Khách hàng ({customers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#073D63] text-[#FCF9F5]'
                  : 'text-[#5E4B3C] hover:bg-[#EFE8DD] hover:text-[#2B2018]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Cài đặt &amp; Firebase</span>
            </button>
          </nav>
        </div>

        <div className="hidden lg:block p-6 border-t border-[#EFE8DD] space-y-2.5">
          <button
            type="button"
            onClick={onBackToStore}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] hover:bg-[#EFE8DD] text-sm font-medium text-[#2B2018] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại cửa hàng</span>
          </button>

          <button
            type="button"
            onClick={onLockAdmin}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#5E4B3C] hover:text-[#9E3B2B] hover:bg-[#F5E4E1]/50 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Khóa trang quản trị</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <header className="bg-[#FCF9F5] border-b border-[#E2D7C6] px-6 md:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-[#867363] hidden sm:inline">
              Quản trị {SITE_CONFIG.brandName}
            </span>
            <span className="text-[#867363] hidden sm:inline">/</span>
            <h1 className="font-semibold text-[#2B2018] truncate">
              {tabTitles[activeTab]}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openCreateProduct}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm sản phẩm</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 space-y-8 max-w-[1200px] w-full">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-5 space-y-1.5">
                  <p className="text-xs font-medium text-[#867363]">
                    Tổng doanh thu ghi nhận
                  </p>
                  <p className="text-2xl font-bold text-[#2B2018] tabular-nums">
                    {formatVND(metrics.totalRevenue)}
                  </p>
                  <p className="text-xs text-[#5E4B3C]">Tính trên đơn hợp lệ</p>
                </div>

                <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-5 space-y-1.5">
                  <p className="text-xs font-medium text-[#867363]">
                    Tổng số đơn hàng
                  </p>
                  <p className="text-2xl font-bold text-[#2B2018] tabular-nums">
                    {metrics.totalOrders}
                  </p>
                  <p className="text-xs text-[#5E4B3C] tabular-nums">
                    {orders.filter((o) => o.orderStatus === 'Hoàn tất').length} đơn đã hoàn tất
                  </p>
                </div>

                <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-5 space-y-1.5">
                  <p className="text-xs font-medium text-[#867363]">
                    Giá trị đơn trung bình
                  </p>
                  <p className="text-2xl font-bold text-[#2B2018] tabular-nums">
                    {formatVND(metrics.avgOrderValue)}
                  </p>
                  <p className="text-xs text-[#5E4B3C] tabular-nums">
                    Miễn phí vận chuyển từ 1.500.000₫
                  </p>
                </div>

                <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-5 space-y-1.5">
                  <p className="text-xs font-medium text-[#867363]">
                    Tồn kho xưởng hiện tại
                  </p>
                  <p className="text-2xl font-bold text-[#2B2018] tabular-nums">
                    {metrics.totalStockUnits} sản phẩm
                  </p>
                  <p className="text-xs text-[#5E4B3C] tabular-nums">
                    Thuộc {products.length} dòng chế tác
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-[#2B2018]">
                      Doanh thu sản phẩm
                    </h2>
                    <p className="text-xs text-[#867363] mt-0.5">
                      Phân bổ theo dòng sản phẩm
                    </p>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(metrics.productRevenue).map(([name, value]) => {
                      const widthPct = Math.round(
                        (value / metrics.maxProductRevenue) * 100
                      );
                      return (
                        <div key={name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#2B2018]">{name}</span>
                            <span className="font-semibold text-[#073D63] tabular-nums">
                              {formatVND(value)}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE8DD]">
                            <div
                              className="h-full rounded-full bg-[#073D63]"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#EFE8DD] flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#2B2018]">
                      Đơn hàng gần nhất
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-medium text-[#073D63] hover:text-[#5E3A1F] underline underline-offset-4 cursor-pointer"
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#5E4B3C]">
                      Chưa có đơn hàng nào được tạo.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#EFE8DD] text-xs font-medium text-[#867363] bg-[#F8F4EE]/60">
                            <th className="py-3 px-6">Mã đơn</th>
                            <th className="py-3 px-4">Khách hàng</th>
                            <th className="py-3 px-4">Trạng thái</th>
                            <th className="py-3 px-6 text-right">Tổng tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE8DD] text-sm">
                          {orders.slice(0, 5).map((order) => (
                            <tr
                              key={order.orderNumber}
                              className="hover:bg-[#F8F4EE]/70 transition-colors"
                            >
                              <td className="py-3 px-6 font-medium text-[#2B2018] tabular-nums whitespace-nowrap">
                                #{order.orderNumber}
                              </td>
                              <td className="py-3 px-4 text-[#2B2018]">
                                <p className="font-medium truncate max-w-[180px]">
                                  {order.customerName}
                                </p>
                                <p className="text-xs text-[#867363]">
                                  {order.city}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-xs text-[#5E4B3C] whitespace-nowrap">
                                {order.orderStatus}
                              </td>
                              <td className="py-3 px-6 text-right font-semibold text-[#2B2018] tabular-nums whitespace-nowrap">
                                {formatVND(order.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredOrders.length > 0 && (
                    <div className="flex items-center justify-between border-t border-[#E2D7C6] px-4 py-3 text-xs text-[#5E4B3C]">
                      <span>
                        Trang {orderPage}/{totalOrderPages} · {filteredOrders.length} đơn
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={orderPage <= 1}
                          onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                          className="rounded-lg border border-[#E2D7C6] px-3 py-1.5 disabled:opacity-40"
                        >
                          Trước
                        </button>
                        <button
                          type="button"
                          disabled={orderPage >= totalOrderPages}
                          onClick={() =>
                            setOrderPage((page) =>
                              Math.min(totalOrderPages, page + 1)
                            )
                          }
                          className="rounded-lg border border-[#E2D7C6] px-3 py-1.5 disabled:opacity-40"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <label htmlFor={`${fieldId}-product-search`} className="sr-only">
                    Tìm sản phẩm trong quản trị
                  </label>
                  <Search className="w-4 h-4 text-[#867363] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={`${fieldId}-product-search`}
                    name="productSearch"
                    type="text"
                    autoComplete="off"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Tìm sản phẩm theo tên, mã SKU, ..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] placeholder:text-[#867363] focus:outline-none focus:border-[#073D63]"
                  />
                </div>

                <label htmlFor={`${fieldId}-product-category-filter`} className="sr-only">
                  Lọc danh mục sản phẩm trong quản trị
                </label>
                <select
                  id={`${fieldId}-product-category-filter`}
                  name="productCategory"
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  aria-label="Lọc danh mục sản phẩm trong quản trị"
                  className="px-3.5 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                >
                  {CRAFT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {productActionError && (
                <p className="rounded-lg bg-[#F5E4E1] px-3.5 py-2.5 text-xs font-medium text-[#9E3B2B]">
                  {productActionError}
                </p>
              )}

              <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl overflow-hidden">
                {filteredProducts.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <p className="text-lg font-semibold text-[#2B2018]">
                      Không có sản phẩm phù hợp
                    </p>
                    <button
                      type="button"
                      onClick={openCreateProduct}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#073D63] text-[#FCF9F5] text-sm font-medium cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm sản phẩm mới</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2D7C6] text-xs font-medium text-[#867363] bg-[#F8F4EE]">
                          <th className="py-3 px-6">Sản phẩm</th>
                          <th className="py-3 px-4">Danh mục · </th>
                          <th className="py-3 px-4 text-right">Giá bán</th>
                          <th className="py-3 px-4 text-right">Phiên bản</th>
                          <th className="py-3 px-4 text-right">Tồn kho</th>
                          <th className="py-3 px-4">Tình trạng</th>
                          <th className="py-3 px-6 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE8DD] text-sm">
                        {filteredProducts.map((product) => {
                          const totalStock = product.variants.reduce(
                            (s, v) => s + v.stock,
                            0
                          );
                          return (
                            <tr
                              key={product.id}
                              className="hover:bg-[#F8F4EE]/70 transition-colors"
                            >
                              <td className="py-3 px-6">
                                <div className="flex items-center gap-3 min-w-[220px]">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E2D7C6] bg-[#EFE8DD] shrink-0">
                                    <ResilientImage
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-contain p-1"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#2B2018] truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-[#867363] tabular-nums">
                                      {product.sku}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs text-[#5E4B3C] whitespace-nowrap">
                                {product.category} · {product.village}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-[#2B2018] tabular-nums whitespace-nowrap">
                                {formatVND(product.price)}
                              </td>
                              <td className="py-3 px-4 text-right text-xs text-[#5E4B3C] tabular-nums whitespace-nowrap">
                                {product.variants.length} mẫu
                              </td>
                              <td className="py-3 px-4 text-right text-[#2B2018] tabular-nums whitespace-nowrap">
                                {totalStock}
                              </td>
                              <td className="py-3 px-4 text-xs whitespace-nowrap">
                                <span
                                  className={
                                    totalStock > 0
                                      ? 'text-[#3F5E3B] font-medium'
                                      : 'text-[#9E3B2B] font-medium'
                                  }
                                >
                                  {totalStock > 0
                                    ? product.availabilityTag
                                    : 'Tạm hết hàng'}
                                </span>
                              </td>
                              <td className="py-3 px-6 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditProduct(product)}
                                    aria-label={`Sửa ${product.name}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2D7C6] hover:bg-[#EFE8DD] text-xs font-medium text-[#2B2018] cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProductClick(product.id)}
                                    aria-label={`Xóa ${product.name}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2D7C6] hover:bg-[#F5E4E1] text-xs font-medium text-[#9E3B2B] cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <label htmlFor={`${fieldId}-order-search`} className="sr-only">
                    Tìm đơn hàng trong quản trị
                  </label>
                  <Search className="w-4 h-4 text-[#867363] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={`${fieldId}-order-search`}
                    name="orderSearch"
                    type="text"
                    autoComplete="off"
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="Tìm theo mã đơn, tên khách hàng, số điện thoại..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] placeholder:text-[#867363] focus:outline-none focus:border-[#073D63]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['Tất cả', ...ORDER_STATUS_OPTIONS].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        orderStatusFilter === status
                          ? 'bg-[#073D63] text-[#FCF9F5]'
                          : 'bg-[#F8F4EE] text-[#5E4B3C] hover:bg-[#EFE8DD]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-[#867363]">
                    Từ
                    <input
                      type="date"
                      value={orderDateFrom}
                      onChange={(event) => setOrderDateFrom(event.target.value)}
                      className="ml-1.5 rounded-lg border border-[#E2D7C6] bg-white px-2 py-1.5 text-xs"
                    />
                  </label>
                  <label className="text-xs text-[#867363]">
                    Đến
                    <input
                      type="date"
                      value={orderDateTo}
                      onChange={(event) => setOrderDateTo(event.target.value)}
                      className="ml-1.5 rounded-lg border border-[#E2D7C6] bg-white px-2 py-1.5 text-xs"
                    />
                  </label>
                </div>
              </div>

              {orderActionError && (
                <p role="alert" className="rounded-lg bg-[#F5E4E1] px-3.5 py-2.5 text-xs font-medium text-[#9E3B2B]">
                  {orderActionError}
                </p>
              )}

              <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl overflow-hidden">
                {filteredOrders.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <p className="text-lg font-semibold text-[#2B2018]">
                      Không tìm thấy đơn hàng nào
                    </p>
                    <p className="text-sm text-[#5E4B3C]">
                      Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2D7C6] text-xs font-medium text-[#867363] bg-[#F8F4EE]">
                          <th className="py-3 px-6">Mã đơn · Thời gian</th>
                          <th className="py-3 px-4">Khách hàng</th>
                          <th className="py-3 px-4">Thanh toán</th>
                          <th className="py-3 px-4">Trạng thái xử lý</th>
                          <th className="py-3 px-4 text-right">Tổng tiền</th>
                          <th className="py-3 px-6 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE8DD] text-sm">
                        {pagedOrders.map((order) => (
                          <tr
                            key={order.orderNumber}
                            className="hover:bg-[#F8F4EE]/70 transition-colors"
                          >
                            <td className="py-3.5 px-6 whitespace-nowrap">
                              <p className="font-semibold text-[#2B2018] tabular-nums">
                                #{order.orderNumber}
                              </p>
                              <p className="text-xs text-[#867363] tabular-nums">
                                {formatOrderDate(order.createdAt)}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-[#2B2018]">
                                {order.customerName}
                              </p>
                              <p className="text-xs text-[#867363] tabular-nums">
                                {order.phone} · {order.city}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <p className="font-medium text-[#2B2018]">
                                {order.paymentMethod === 'vietqr' && 'VietQR 24/7'}
                                {order.paymentMethod === 'card' && 'Thẻ ATM / Visa'}
                                {order.paymentMethod === 'ewallet' &&
                                  `Ví ${order.ewalletProvider === 'vnpay' ? 'VNPay' : 'MoMo'}`}
                                {order.paymentMethod === 'cod' && 'COD'}
                              </p>
                              <p className="text-[#5E4B3C] mt-0.5">
                                {order.paymentStatus === 'awaiting_admin_review'
                                  ? 'Chờ duyệt giá'
                                  : order.paymentStatus}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <label htmlFor={`${fieldId}-order-status-${order.orderNumber}`} className="sr-only">
                                Cập nhật trạng thái đơn {order.orderNumber}
                              </label>
                              <select
                                id={`${fieldId}-order-status-${order.orderNumber}`}
                                name={`orderStatus-${order.orderNumber}`}
                                value={order.orderStatus}
                                disabled={
                                  order.paymentStatus === 'awaiting_admin_review'
                                }
                                onChange={(e) =>
                                  void handleOrderStatusChange(
                                    order.orderNumber,
                                    e.target.value as OrderStatus
                                  )
                                }
                                aria-label={`Cập nhật trạng thái đơn ${order.orderNumber}`}
                                className="px-2.5 py-1.5 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-xs font-medium text-[#2B2018] focus:outline-none focus:border-[#073D63] cursor-pointer"
                              >
                                {ORDER_STATUS_OPTIONS.map((statusOption) => (
                                  <option key={statusOption} value={statusOption}>
                                    {statusOption}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-[#073D63] tabular-nums whitespace-nowrap">
                              {order.paymentStatus === 'awaiting_admin_review'
                                ? 'Chờ duyệt giá'
                                : formatVND(order.total)}
                            </td>
                            <td className="py-3.5 px-6 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setInspectingOrder(order)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#E2D7C6] hover:bg-[#EFE8DD] text-xs font-medium text-[#2B2018] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl overflow-hidden">
              {customers.length === 0 ? (
                <div className="p-12 text-center text-sm text-[#5E4B3C]">
                  Chưa có khách hàng trong đơn hàng.
                </div>
              ) : (
                <div className="divide-y divide-[#EFE8DD]">
                  {customers.map((customer) => (
                    <div
                      key={customer.key}
                      className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-[#2B2018]">
                          {customer.name}
                        </p>
                        <p className="text-xs text-[#867363]">
                          {customer.phone} · {customer.email}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-[#073D63] tabular-nums">
                          {formatVND(customer.total)}
                        </p>
                        <p className="text-xs text-[#867363]">
                          {customer.orders} đơn hàng
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS & FIREBASE */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 gap-6">
              {/* Firebase & Data Persistence Info */}
              <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-[#073D63]" />
                  <h2 className="text-base font-semibold text-[#2B2018]">
                    Trạng thái lưu trữ dữ liệu &amp; Firebase
                  </h2>
                </div>

                <div className="p-4 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] space-y-2 text-sm">
                  <p className="font-semibold text-[#2B2018]">
                    {storageMode === 'firebase'
                      ? 'Đã kết nối Firebase Firestore'
                      : 'Đang chạy chế độ Localhost (lưu tại trình duyệt)'}
                  </p>
                  <p className="text-xs text-[#5E4B3C] leading-relaxed">
                    {storageMode === 'firebase'
                      ? 'Sản phẩm, đơn hàng và hồ sơ khách hàng được đồng bộ với các bộ sưu tập products, orders và customers trên Firebase Firestore.'
                      : 'Tất cả sản phẩm, ảnh tải lên từ máy tính và đơn hàng đang được lưu an toàn trên LocalStorage để bạn vận hành thử trên localhost.'}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-[#5E4B3C]">
                  <p className="font-semibold text-[#2B2018]">
                    Hướng dẫn gắn API Firebase sau này:
                  </p>
                  <p className="leading-relaxed">
                    Khi đã tạo dự án Firebase Firestore, bạn chỉ cần điền các biến môi trường sau vào tệp{' '}
                    <code className="px-1.5 py-0.5 rounded bg-[#EFE8DD] text-[#2B2018]">
                      .env
                    </code>{' '}
                    và khởi động lại máy chủ:
                  </p>
                  <pre className="p-3.5 rounded-lg bg-[#2B2018] text-[#EFE8DD] text-[11px] overflow-x-auto leading-relaxed">
                    {`VITE_FIREBASE_API_KEY="..."\nVITE_FIREBASE_AUTH_DOMAIN="..."\nVITE_FIREBASE_PROJECT_ID="..."\nVITE_FIREBASE_STORAGE_BUCKET="..."\nVITE_FIREBASE_MESSAGING_SENDER_ID="..."\nVITE_FIREBASE_APP_ID="..."`}
                  </pre>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Detailed Add / Edit Product Modal with Local Computer Image Upload */}
      {editingProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2018]/50 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Chỉnh sửa chi tiết sản phẩm"
          onClick={() => setEditingProductModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2D7C6] bg-[#F8F4EE] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[#2B2018]">
                  {productForm.id
                    ? 'Chỉnh sửa chi tiết sản phẩm thủ công'
                    : 'Thêm sản phẩm mới vào cửa hàng'}
                </h2>
                <p className="text-xs text-[#867363]">
                  Hỗ trợ tải ảnh sắc nét HD trực tiếp từ máy tính, tự động căn khung chuẩn đẹp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProductModalOpen(false)}
                aria-label="Đóng biểu mẫu sản phẩm"
                className="w-8 h-8 rounded-lg border border-[#E2D7C6] flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProductSubmit}
              className="p-6 space-y-6 overflow-y-auto flex-1"
            >
              {productFormError && (
                <p className="text-xs font-medium text-[#9E3B2B] bg-[#F5E4E1] px-3.5 py-2.5 rounded-lg">
                  {productFormError}
                </p>
              )}

              {/* Section 1: Computer Image Upload & Gallery */}
              <div className="space-y-3 pb-5 border-b border-[#EFE8DD]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B2018]">
                      1. Hình ảnh sản phẩm (Liên kết từ máy tính)
                    </h3>
                    <p className="text-xs text-[#867363]">
                      Chọn hoặc kéo thả ảnh từ máy tính (JPG, PNG, WEBP). Ảnh tự động giữ toàn bộ nội dung, tối ưu độ nét HD 1600×1200 và khớp khung tỷ lệ 4:3.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingImages ? 'Đang xử lý ảnh nét...' : 'Chọn ảnh từ máy tính'}
                    </span>
                  </button>
                  <label htmlFor={`${fieldId}-product-images`} className="sr-only">
                    Chọn ảnh sản phẩm từ máy tính
                  </label>
                  <input
                    id={`${fieldId}-product-images`}
                    name="productImages"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleLocalFilesSelected(e.target.files)}
                    className="hidden"
                  />
                </div>

                {/* Drag & Drop + Gallery Preview */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    handleLocalFilesSelected(e.dataTransfer.files);
                  }}
                  className={`p-4 rounded-xl border-2 border-dashed transition-colors ${
                    isDraggingFile
                      ? 'border-[#073D63] bg-[#EFE8DD]'
                      : 'border-[#D7C9B4] bg-[#F8F4EE]'
                  }`}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {productForm.galleryImages.map((imgUrl, idx) => {
                      const isMain = productForm.image === imgUrl;
                      return (
                        <div
                          key={`${imgUrl.slice(0, 24)}-${idx}`}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border bg-[#EFE8DD] group ${
                            isMain
                              ? 'border-[#073D63] ring-2 ring-[#073D63]'
                              : 'border-[#E2D7C6]'
                          }`}
                        >
                          <ResilientImage
                            src={imgUrl}
                            alt={`Ảnh sản phẩm ${idx + 1}`}
                            className="w-full h-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setProductForm((prev) => ({ ...prev, image: imgUrl }))
                            }
                            className={`absolute left-1.5 bottom-1.5 px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                              isMain
                                ? 'bg-[#073D63] text-[#FCF9F5]'
                                : 'bg-[#FCF9F5]/90 text-[#2B2018] hover:bg-[#FCF9F5]'
                            }`}
                          >
                            {isMain ? 'Ảnh chính' : 'Đặt ảnh chính'}
                          </button>
                          {productForm.galleryImages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(imgUrl)}
                              aria-label="Xóa ảnh này"
                              className="absolute right-1.5 top-1.5 w-6 h-6 rounded-md bg-[#2B2018]/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/3] rounded-lg border border-[#D7C9B4] bg-[#FCF9F5] hover:bg-[#EFE8DD] flex flex-col items-center justify-center gap-1.5 text-xs text-[#5E4B3C] cursor-pointer transition-colors"
                    >
                      <ImagePlus className="w-5 h-5 text-[#073D63]" />
                      <span>Tải thêm ảnh</span>
                    </button>
                  </div>

                  {/* Studio Preset Quick Picker */}
                  <div className="mt-3 pt-3 border-t border-[#E2D7C6] flex flex-wrap items-center gap-2 text-xs">
                    <label htmlFor={`${fieldId}-studio-image`} className="text-[#867363]">
                      Hoặc thêm nhanh ảnh studio:
                    </label>
                    <select
                      id={`${fieldId}-studio-image`}
                      name="studioImage"
                      value=""
                      onChange={(e) => {
                        const url = e.target.value;
                        if (!url) return;
                        setProductForm((prev) => ({
                          ...prev,
                          image: prev.image || url,
                          galleryImages: Array.from(
                            new Set([...prev.galleryImages, url])
                          ),
                        }));
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#FCF9F5] border border-[#E2D7C6] text-xs text-[#2B2018]"
                    >
                      <option value="">-- Chọn ảnh studio có sẵn --</option>
                      {STUDIO_IMAGE_PRESETS.map((preset) => (
                        <option key={preset.url} value={preset.url}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Core Info, Pricing & Origin */}
              <div className="space-y-4 pb-5 border-b border-[#EFE8DD]">
                <h3 className="text-sm font-semibold text-[#2B2018]">
                  2. Thông tin cơ bản, Giá bán và Xuất xứ sản phẩm
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor={`${fieldId}-product-name`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Tên sản phẩm *
                    </label>
                    <input
                      id={`${fieldId}-product-name`}
                      name="productName"
                      type="text"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Ví dụ: Máy cưa, máy cắt, máy mài"
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${fieldId}-product-sku`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Mã SKU
                    </label>
                    <input
                      id={`${fieldId}-product-sku`}
                      name="productSku"
                      type="text"
                      value={productForm.sku}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, sku: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] tabular-nums focus:outline-none focus:border-[#073D63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`${fieldId}-product-category`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Danh mục
                    </label>
                    <select
                      id={`${fieldId}-product-category`}
                      name="productCategory"
                      value={productForm.category}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          category: e.target.value as Product['category'],
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    >
                      {CRAFT_CATEGORIES.filter((c) => c !== 'Tất Cả').map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-product-village`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Nơi sản xuất
                    </label>
                    <select
                      id={`${fieldId}-product-village`}
                      name="productVillage"
                      value={productForm.village}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, village: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    >
                      {CRAFT_VILLAGES.filter(
                        (v) => v !== 'Tất cả '
                      ).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-product-material`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Chất liệu 
                    </label>
                    <select
                      id={`${fieldId}-product-material`}
                      name="productMaterial"
                      value={productForm.material}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, material: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    >
                      {MATERIALS_LIST.filter(
                        (m) => m !== 'Tất cả chất liệu'
                      ).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor={`${fieldId}-product-price`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Giá bán (VNĐ) *
                    </label>
                    <input
                      id={`${fieldId}-product-price`}
                      name="productPrice"
                      type="number"
                      min={10000}
                      step={10000}
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          price: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-product-original-price`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Giá gốc trước giảm (tuỳ chọn)
                    </label>
                    <input
                      id={`${fieldId}-product-original-price`}
                      name="productOriginalPrice"
                      type="number"
                      min={0}
                      step={10000}
                      value={productForm.originalPrice}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          originalPrice: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-product-craft-days`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Số ngày chế tác
                    </label>
                    <input
                      id={`${fieldId}-product-craft-days`}
                      name="productCraftDays"
                      type="number"
                      min={1}
                      value={productForm.craftDays}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          craftDays: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-product-availability`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Nhãn tình trạng
                    </label>
                    <select
                      id={`${fieldId}-product-availability`}
                      name="productAvailability"
                      value={productForm.availabilityTag}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          availabilityTag: e.target
                            .value as Product['availabilityTag'],
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    >
                      <option value="Còn hàng">Còn hàng</option>
                      <option value="Phiên bản giới hạn">Phiên bản giới hạn</option>
                      <option value="Tạm hết hàng">Tạm hết hàng</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`${fieldId}-product-dimensions`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Kích thước (Dài × Rộng × Cao)
                    </label>
                    <input
                      id={`${fieldId}-product-dimensions`}
                      name="productDimensions"
                      type="text"
                      value={productForm.dimensions}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, dimensions: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${fieldId}-product-weight`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Khối lượng / Quy cách đóng gói
                    </label>
                    <input
                      id={`${fieldId}-product-weight`}
                      name="productWeight"
                      type="text"
                      value={productForm.weight}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, weight: e.target.value }))
                      }
                      placeholder="1.2 kg"
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${fieldId}-product-artisan`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Nghệ nhân / Xưởng chế tác
                    </label>
                    <input
                      id={`${fieldId}-product-artisan`}
                      name="productArtisan"
                      type="text"
                      value={productForm.artisanName}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          artisanName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[#5E4B3C]">
                      Thông số kỹ thuật
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setProductForm((form) => ({
                          ...form,
                          specifications: [
                            ...form.specifications,
                            { label: '', value: '' },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-[#EFE8DD] px-3 py-1.5 text-xs font-semibold text-[#2B2018] hover:bg-[#E2D7C6]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm thông số
                    </button>
                  </div>
                  {productForm.specifications.map((specification, index) => (
                    <div
                      key={`${fieldId}-product-spec-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                    >
                      <div>
                        <label
                          htmlFor={`${fieldId}-product-spec-label-${index}`}
                          className="mb-1 block text-xs font-medium text-[#5E4B3C]"
                        >
                          Tên thông số
                        </label>
                        <input
                          id={`${fieldId}-product-spec-label-${index}`}
                          name={`productSpecificationLabel${index}`}
                          type="text"
                          value={specification.label}
                          onChange={(event) =>
                            setProductForm((form) => ({
                              ...form,
                              specifications: form.specifications.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, label: event.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3 py-2 text-sm text-[#2B2018]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${fieldId}-product-spec-value-${index}`}
                          className="mb-1 block text-xs font-medium text-[#5E4B3C]"
                        >
                          Giá trị
                        </label>
                        <input
                          id={`${fieldId}-product-spec-value-${index}`}
                          name={`productSpecificationValue${index}`}
                          type="text"
                          value={specification.value}
                          onChange={(event) =>
                            setProductForm((form) => ({
                              ...form,
                              specifications: form.specifications.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, value: event.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] px-3 py-2 text-sm text-[#2B2018]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm((form) => ({
                            ...form,
                            specifications: form.specifications.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          }))
                        }
                        aria-label={`Xóa thông số ${index + 1}`}
                        className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2D7C6] text-[#5E4B3C] hover:bg-[#EFE8DD]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Variants Builder */}
              <div className="space-y-3 pb-5 border-b border-[#EFE8DD]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B2018]">
                      3. Các phiên bản chế tác &amp; Tồn kho ({productForm.variants.length})
                    </h3>
                    <p className="text-xs text-[#867363]">
                      Mỗi phiên bản có thể đặt màu men/kích thước, giá chênh lệch và số lượng tồn kho riêng
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFE8DD] hover:bg-[#E2D7C6] text-xs font-semibold text-[#2B2018] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm phiên bản</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {productForm.variants.map((variant, idx) => (
                    <div
                      key={`${variant.id}-${idx}`}
                      className="p-3 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-5">
                        <label htmlFor={`${fieldId}-variant-${idx}-label`} className="block text-[11px] text-[#867363] mb-0.5">
                          Tên phiên bản
                        </label>
                        <input
                          id={`${fieldId}-variant-${idx}-label`}
                          name={`variants.${idx}.label`}
                          type="text"
                          value={variant.label}
                          onChange={(e) =>
                            handleUpdateVariant(idx, { label: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#FCF9F5] border border-[#E2D7C6] text-xs text-[#2B2018]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor={`${fieldId}-variant-${idx}-color`} className="block text-[11px] text-[#867363] mb-0.5">
                          Màu mẫu
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`${fieldId}-variant-${idx}-color`}
                            name={`variants.${idx}.color`}
                            type="color"
                            value={variant.colorHex}
                            onChange={(e) =>
                              handleUpdateVariant(idx, {
                                colorHex: e.target.value,
                              })
                            }
                            className="w-8 h-7 rounded border border-[#E2D7C6] cursor-pointer bg-transparent"
                          />
                          <span className="text-[11px] text-[#5E4B3C] tabular-nums">
                            {variant.colorHex}
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor={`${fieldId}-variant-${idx}-price-delta`} className="block text-[11px] text-[#867363] mb-0.5">
                          Cộng thêm (₫)
                        </label>
                        <input
                          id={`${fieldId}-variant-${idx}-price-delta`}
                          name={`variants.${idx}.priceDelta`}
                          type="number"
                          step={10000}
                          value={variant.priceDelta}
                          onChange={(e) =>
                            handleUpdateVariant(idx, {
                              priceDelta: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#FCF9F5] border border-[#E2D7C6] text-xs text-[#2B2018] tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor={`${fieldId}-variant-${idx}-stock`} className="block text-[11px] text-[#867363] mb-0.5">
                          Tồn kho
                        </label>
                        <input
                          id={`${fieldId}-variant-${idx}-stock`}
                          name={`variants.${idx}.stock`}
                          type="number"
                          min={0}
                          value={variant.stock}
                          onChange={(e) =>
                            handleUpdateVariant(idx, {
                              stock: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#FCF9F5] border border-[#E2D7C6] text-xs text-[#2B2018] tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          disabled={productForm.variants.length <= 1}
                          aria-label="Xóa phiên bản"
                          className="p-1.5 rounded-md text-[#867363] hover:text-[#9E3B2B] disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Descriptions, Story & Smart Keywords */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#2B2018]">
                  4. Mô tả chi tiết, Bảo quản &amp; Từ khóa tìm kiếm
                </h3>

                <div>
                  <label htmlFor={`${fieldId}-product-short-description`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                    Mô tả ngắn ngoài thẻ sản phẩm
                  </label>
                  <textarea
                    id={`${fieldId}-product-short-description`}
                    name="productShortDescription"
                    rows={2}
                    value={productForm.shortDesc}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, shortDesc: e.target.value }))
                    }
                    placeholder="Tóm tắt kỹ thuật chế tác, màu men và công năng sử dụng..."
                    className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                  />
                </div>

                <div>
                  <label htmlFor={`${fieldId}-product-story`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                    Câu chuyện chế tác chi tiết (hiển thị khi bấm xem sản phẩm)
                  </label>
                  <textarea
                    id={`${fieldId}-product-story`}
                    name="productStory"
                    rows={3}
                    value={productForm.story}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, story: e.target.value }))
                    }
                    placeholder="Quy trình tuyển chọn nguyên liệu, số ngày nung/ủ và giá trị văn hóa..."
                    className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${fieldId}-product-care-guide`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Hướng dẫn bảo quản
                    </label>
                    <input
                      id={`${fieldId}-product-care-guide`}
                      name="productCareGuide"
                      type="text"
                      value={productForm.careGuide}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, careGuide: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${fieldId}-product-keywords`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Từ khóa tìm kiếm thông minh (cách nhau dấu phẩy)
                    </label>
                    <input
                      id={`${fieldId}-product-keywords`}
                      name="productKeywords"
                      type="text"
                      value={productForm.keywordsText}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          keywordsText: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018]"
                    />
                  </div>
                </div>

                <label htmlFor={`${fieldId}-product-is-new`} className="inline-flex items-center gap-2 text-xs font-medium text-[#2B2018] cursor-pointer pt-1">
                  <input
                    id={`${fieldId}-product-is-new`}
                    name="productIsNew"
                    type="checkbox"
                    checked={productForm.isNew}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, isNew: e.target.checked }))
                    }
                    className="accent-[#073D63] w-4 h-4"
                  />
                  <span>Ưu tiên hiển thị ở nhóm Sản phẩm mới ra mắt</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#E2D7C6] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-[#E2D7C6] text-sm font-medium text-[#5E4B3C] hover:bg-[#EFE8DD] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium cursor-pointer"
                >
                  Lưu &amp; Đồng bộ lên cửa hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Order Modal */}
      {inspectingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2018]/50 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết đơn hàng ${inspectingOrder.orderNumber}`}
          onClick={() => setInspectingOrder(null)}
        >
          <div
            className="w-full max-w-lg bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2D7C6] bg-[#F8F4EE] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#2B2018] tabular-nums">
                  Đơn hàng #{inspectingOrder.orderNumber}
                </h2>
                <p className="text-xs text-[#867363] tabular-nums">
                  Đặt lúc {formatOrderDate(inspectingOrder.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-[#E2D7C6] px-3 py-1.5 text-xs font-medium text-[#2B2018]"
                >
                  In đơn
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingOrder(null)}
                  aria-label="Đóng chi tiết đơn hàng"
                  className="w-8 h-8 rounded-lg border border-[#E2D7C6] flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F5E3B]">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {inspectingOrder.paymentStatus === 'awaiting_admin_review'
                    ? 'Chờ duyệt giá'
                    : inspectingOrder.paymentStatus}{' '}
                  · {inspectingOrder.orderStatus}
                </span>
              </div>
              {orderActionError && (
                <p role="alert" className="rounded-lg bg-[#F5E4E1] px-3.5 py-2.5 text-xs font-medium text-[#9E3B2B]">
                  {orderActionError}
                </p>
              )}
              {inspectingOrder.paymentStatus === 'awaiting_admin_review' && (
                <div className="space-y-2 rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] p-4">
                  <p className="text-xs leading-relaxed text-[#5E4B3C]">
                    Đơn mới chưa có giá được xác nhận. Bấm duyệt để lấy giá, phân loại
                    và tồn kho từ danh mục Firestore; sau đó khách mới xem được QR hoặc
                    số tiền COD.
                  </p>
                  <button
                    type="button"
                    disabled={approvingOrder}
                    onClick={() =>
                      void handleApproveOrder(inspectingOrder.orderNumber)
                    }
                    className="w-full rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] disabled:opacity-60"
                  >
                    {approvingOrder
                      ? 'Đang xác minh catalog...'
                      : 'Xác nhận giá và tồn kho'}
                  </button>
                </div>
              )}
              {inspectingOrder.paymentMethod === 'vietqr' &&
                inspectingOrder.paymentStatus === 'awaiting_confirmation' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={paymentConfirming}
                      onClick={() =>
                        void handleConfirmOrderPayment(
                          inspectingOrder.orderNumber,
                          true
                        )
                      }
                      className="w-full rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] disabled:opacity-60"
                    >
                      {paymentConfirming
                        ? 'Đang cập nhật...'
                        : 'Đã nhận tiền'}
                    </button>
                    <label className="block text-xs font-medium text-[#5E4B3C]">
                      Ghi chú khi chưa nhận được tiền
                      <textarea
                        value={paymentRejectionNote}
                        onChange={(event) =>
                          setPaymentRejectionNote(event.target.value)
                        }
                        maxLength={500}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-[#E2D7C6] bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={
                        paymentConfirming || paymentRejectionNote.trim().length === 0
                      }
                      onClick={() =>
                        void handleConfirmOrderPayment(
                          inspectingOrder.orderNumber,
                          false
                        )
                      }
                      className="w-full rounded-lg border border-[#9E3B2B] px-4 py-2.5 text-sm font-medium text-[#9E3B2B] disabled:opacity-50"
                    >
                      Chưa nhận được tiền
                    </button>
                  </div>
                )}

              <div className="p-4 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] space-y-1 text-xs text-[#5E4B3C]">
                <p>
                  <strong className="text-[#2B2018]">Người nhận:</strong>{' '}
                  {inspectingOrder.customerName} ({inspectingOrder.phone})
                </p>
                <p>
                  <strong className="text-[#2B2018]">Email:</strong>{' '}
                  {inspectingOrder.email}
                </p>
                {inspectingOrder.paymentMethod === 'vietqr' &&
                  inspectingOrder.paymentReference && (
                    <p>
                      <strong className="text-[#2B2018]">
                        Nội dung chuyển khoản:
                      </strong>{' '}
                      <span className="font-mono">
                        {inspectingOrder.paymentReference}
                      </span>
                    </p>
                  )}
                <p>
                  <strong className="text-[#2B2018]">Địa chỉ:</strong>{' '}
                  {formatAddressWithCity(inspectingOrder.address, inspectingOrder.city)}
                </p>
                <p>
                  <strong className="text-[#2B2018]">Dự kiến giao:</strong>{' '}
                  {inspectingOrder.estimatedDelivery}
                </p>
              </div>

              <div className="divide-y divide-[#EFE8DD] border border-[#E2D7C6] rounded-lg px-4">
                {inspectingOrder.items.map((item, idx) => {
                  const catalogProduct = products.find(
                    (product) => product.id === item.productId
                  );
                  const catalogVariant = catalogProduct?.variants.find(
                    (variant) => variant.id === item.variantId
                  );
                  const awaitingPriceApproval =
                    inspectingOrder.paymentStatus === 'awaiting_admin_review';
                  return (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-medium text-[#2B2018]">
                          {awaitingPriceApproval
                            ? catalogProduct?.name ?? `Sản phẩm ${item.productId}`
                            : item.name}{' '}
                          × {item.quantity}
                        </p>
                        <p className="text-[#867363]">
                          {awaitingPriceApproval
                            ? catalogVariant?.label ?? `Phân loại ${item.variantId}`
                            : item.variantLabel}
                        </p>
                      </div>
                      <span className="font-semibold text-[#2B2018] tabular-nums">
                        {awaitingPriceApproval
                          ? 'Chưa xác nhận giá'
                          : formatVND(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                {inspectingOrder.paymentStatus === 'awaiting_admin_review' ? (
                  <p className="py-3 text-xs text-[#867363]">
                    Tổng tiền sẽ được tính từ danh mục khi admin duyệt đơn.
                  </p>
                ) : (
                  <div className="py-3 space-y-1.5 text-xs text-[#5E4B3C]">
                  <div className="flex justify-between">
                    <span>Tiền hàng</span>
                    <span className="tabular-nums">
                      {formatVND(
                        inspectingOrder.subtotal ??
                          inspectingOrder.items.reduce(
                            (sum, item) => sum + item.unitPrice * item.quantity,
                            0
                          )
                      )}
                    </span>
                  </div>
                  {(inspectingOrder.discount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Giảm giá</span>
                      <span className="tabular-nums">
                        -{formatVND(inspectingOrder.discount ?? 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Phí vận chuyển</span>
                    <span className="tabular-nums">
                      {formatVND(inspectingOrder.shippingFee ?? 35000)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#EFE8DD] pt-2 font-semibold text-[#2B2018]">
                    <span>Tổng thanh toán</span>
                    <span className="text-[#073D63] tabular-nums">
                      {formatVND(inspectingOrder.total)}
                    </span>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}