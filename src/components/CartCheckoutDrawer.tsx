import { useEffect, useId, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  CartItem,
  CheckoutForm,
  Order,
  PaymentMethod,
  Product,
} from '../types/shop';
import {
  formatCardExpiry,
  formatCardNumber,
  formatAddressWithCity,
  formatVND,
} from '../utils/format';
import { SITE_CONFIG } from '../config/site';
import { PAYMENT_CONFIG } from '../config/payment';
import { CustomerProfile } from '../services/customerRepository';
import { ResilientImage } from './ResilientImage';

export type DrawerStep = 'cart' | 'checkout' | 'receipt';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  step: DrawerStep;
  onChangeStep: (step: DrawerStep) => void;
  onClose: () => void;
  products: Product[];
  cart: CartItem[];
  onUpdateQuantity: (productId: string, variantId: string, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onCompleteOrder: (order: Order) => Promise<Order>;
  onOpenOrderHistory: () => void;
  onOpenAccount: () => void;
  onMarkPaymentSent: (orderNumber: string) => Promise<void>;
  customer: CustomerProfile | null;
  customerOrders: Order[];
  initialReceiptOrder: Order | null;
}

const FREE_SHIPPING_THRESHOLD = 1500000;
const VIETQR_BANK_BIN = PAYMENT_CONFIG.vietqr.bankBin;
const VIETQR_BANK_NAME = PAYMENT_CONFIG.vietqr.bankName;
const VIETQR_ACCOUNT_NUMBER = PAYMENT_CONFIG.vietqr.accountNumber;
const VIETQR_ACCOUNT_NAME = PAYMENT_CONFIG.vietqr.accountName;

const INITIAL_FORM: CheckoutForm = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  city: 'Hà Nội',
  note: '',
  shippingMethod: 'standard',
  paymentMethod: 'cod',
  ewalletProvider: 'momo',
  cardNumber: '',
  cardHolder: '',
  cardExpiry: '',
  cardCvv: '',
};

export function CartCheckoutDrawer({
  isOpen,
  step,
  onChangeStep,
  onClose,
  products,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCompleteOrder,
  onOpenOrderHistory,
  onOpenAccount,
  onMarkPaymentSent,
  customer,
  customerOrders,
  initialReceiptOrder,
}: CartCheckoutDrawerProps) {
  const fieldId = useId().replace(/:/g, '');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedRef, setCopiedRef] = useState<string | false>(false);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [paymentSubmitError, setPaymentSubmitError] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const receiptOrder = latestOrder
    ? customerOrders.find(
        (order) => order.orderNumber === latestOrder.orderNumber
      ) ?? latestOrder
    : null;

  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({
      ...current,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    }));
  }, [customer]);

  useEffect(() => {
    if (!isOpen || !initialReceiptOrder) return;
    setLatestOrder(initialReceiptOrder);
    setQrImageFailed(false);
    onChangeStep('receipt');
  }, [initialReceiptOrder, isOpen, onChangeStep]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const enrichedItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const variant =
          product.variants.find((v) => v.id === item.variantId) ??
          product.variants[0];
        const unitPrice = product.price + (variant?.priceDelta ?? 0);
        return {
          ...item,
          product,
          variant,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, products]);

  const subtotal = useMemo(
    () => enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [enrichedItems]
  );

  const discount = useMemo(() => {
    if (appliedPromo === SITE_CONFIG.announcement.promoCode) {
      return Math.round(subtotal * 0.1);
    }
    return 0;
  }, [appliedPromo, subtotal]);

  const shippingFee = useMemo(() => {
    if (enrichedItems.length === 0) return 0;
    if (form.shippingMethod === 'express') return 65000;
    if (appliedPromo === 'FREESHIP' || subtotal - discount >= FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    return 35000;
  }, [enrichedItems.length, form.shippingMethod, appliedPromo, subtotal, discount]);

  const finalTotal = Math.max(0, subtotal - discount + shippingFee);

  const remainingForFreeShip = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - (subtotal - discount)
  );
  const freeShipProgress = Math.min(
    100,
    Math.round(((subtotal - discount) / FREE_SHIPPING_THRESHOLD) * 100)
  );

  if (!isOpen) return null;

  const handleApplyPromo = (codeOverride?: string) => {
    const code = (codeOverride ?? promoInput).trim().toUpperCase();
    if (!code) return;
    if (code === SITE_CONFIG.announcement.promoCode || code === 'FREESHIP') {
      setAppliedPromo(code);
      setPromoInput(code);
      setPromoError('');
    } else {
      setPromoError(
        `Mã ưu đãi không hợp lệ. Thử ${SITE_CONFIG.announcement.promoCode} hoặc FREESHIP.`
      );
    }
  };

  const validateCheckout = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên người nhận.';
    if (!/^(0|\+84)\d{8,10}$/.test(form.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Số điện thoại Việt Nam chưa hợp lệ (vd: 0912345678).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Vui lòng nhập email để nhận hóa đơn điện tử.';
    }
    if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ giao hàng cụ thể.';

    if (form.paymentMethod === 'card') {
      const cardDigits = form.cardNumber.replace(/\s+/g, '');
      if (cardDigits.length < 16) {
        errors.cardNumber = 'Nhập đủ 16 chữ số trên thẻ.';
      }
      if (!form.cardHolder.trim()) {
        errors.cardHolder = 'Nhập tên chủ thẻ in hoa không dấu.';
      }
      if (!/^\d{2}\/\d{2}$/.test(form.cardExpiry)) {
        errors.cardExpiry = 'Định dạng MM/YY.';
      }
      if (!/^\d{3,4}$/.test(form.cardCvv)) {
        errors.cardCvv = 'Nhập mã CVV (3-4 số).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      setOrderError('Đăng nhập tài khoản khách hàng để lưu và theo dõi đơn hàng.');
      onOpenAccount();
      return;
    }
    if (!validateCheckout() || enrichedItems.length === 0) return;

    setOrderError('');
    const uuid = window.crypto.randomUUID();
    const orderNumber = `${SITE_CONFIG.orderNumberPrefix}-${uuid.replace(/-/g, '')}`;
    const paymentReference =
      form.paymentMethod === 'vietqr' ? orderNumber : undefined;
    const now = new Date();
    const deliveryDate = new Date(
      now.getTime() +
        (form.shippingMethod === 'express' ? 1 : 3) * 24 * 60 * 60 * 1000
    );

    const newOrder: Order = {
      orderNumber,
      customerUid: customer.uid,
      createdAt: now.toISOString(),
      customerName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city,
      shippingMethod: form.shippingMethod,
      paymentMethod: form.paymentMethod,
      ...(form.paymentMethod === 'ewallet'
        ? { ewalletProvider: form.ewalletProvider }
        : {}),
      ...(paymentReference ? { paymentReference } : {}),
      paymentStatus:
        form.paymentMethod === 'cod'
          ? 'Thanh toán khi nhận hàng'
          : 'pending_payment',
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
      total: finalTotal,
      ...(appliedPromo ? { promoCode: appliedPromo } : {}),
      items: enrichedItems.map((item) => ({
        productId: item.product.id,
        variantId: item.variant.id,
        name: item.product.name,
        category: item.product.category,
        variantLabel: item.variant.label,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        image: item.product.image,
      })),
    };

    setOrderBusy(true);
    let savedOrder: Order;
    try {
      savedOrder = await onCompleteOrder(newOrder);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : 'Không thể lưu đơn hàng. Vui lòng thử lại.'
      );
      return;
    } finally {
      setOrderBusy(false);
    }

    setQrImageFailed(false);
    setPaymentSubmitError('');
    setLatestOrder(savedOrder);
    onChangeStep('receipt');
  };

  const handleMarkPaymentSent = async (order: Order) => {
    setPaymentSubmitError('');
    setPaymentSubmitting(true);
    try {
      await onMarkPaymentSent(order.orderNumber);
    } catch (error) {
      setPaymentSubmitError(
        error instanceof Error
          ? error.message
          : 'Không thể gửi thông báo thanh toán. Vui lòng thử lại.'
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleCopyValue = async (key: string, value: string) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(value);
      setCopiedRef(key);
      window.setTimeout(() => setCopiedRef(false), 1500);
    } catch {
      setCopyError('Không thể tự sao chép. Vui lòng sao chép thông tin thủ công.');
    }
  };

  const handleCopyTransfer = async (order: Order) => {
    if (!order.paymentReference) return;
    await handleCopyValue(
      'transfer',
      `${VIETQR_BANK_NAME} - ${VIETQR_ACCOUNT_NUMBER} - ${VIETQR_ACCOUNT_NAME} - ${order.total} - ${order.paymentReference}`
    );
  };

  const paymentOptions: {
    id: PaymentMethod;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'vietqr',
      title: 'Chuyển khoản VietQR',
      desc: 'Quét QR sau khi lưu đơn; quản trị viên sẽ kiểm tra giao dịch và xác nhận thủ công.',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'cod',
      title: 'Thanh toán khi nhận hàng (COD)',
      desc: 'Kiểm tra hàng nguyên vẹn trước khi trả tiền',
      icon: <Truck className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#2B2018]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Giỏ hàng và thanh toán"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-xl bg-[#FCF9F5] h-full border-l border-[#E2D7C6] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E2D7C6] flex items-center justify-between gap-4 bg-[#F8F4EE]">
          <div className="flex items-center gap-3">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => onChangeStep('cart')}
                aria-label="Quay lại giỏ hàng"
                className="w-8 h-8 rounded-lg border border-[#E2D7C6] flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#2B2018]">
                {step === 'cart' && 'Giỏ Hàng Của Bạn'}
                {step === 'checkout' && 'Xác Nhận Đơn Hàng'}
                {step === 'receipt' && 'Xác Nhận Đơn Hàng'}
              </h2>
              {step !== 'receipt' && (
                <p className="text-xs text-[#867363] tabular-nums">
                  {enrichedItems.reduce((s, i) => s + i.quantity, 0)} sản phẩm thủ công
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ngăn giỏ hàng"
            className="w-9 h-9 rounded-lg border border-[#E2D7C6] flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'cart' && (
            <>
              {enrichedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#EFE8DD] flex items-center justify-center text-[#073D63]">
                    <ShoppingBag className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-serif text-2xl font-semibold text-[#2B2018]">
                      Giỏ hàng đang trống
                    </p>
                    <p className="text-sm text-[#5E4B3C] max-w-xs">
                      Hãy chọn thêm sản phẩm gốm, mây tre đan hoặc gỗ mỹ nghệ để hoàn thiện không gian sống của bạn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors cursor-pointer"
                  >
                    Tiếp tục xem sản phẩm
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Free Shipping Progress */}
                  <div className="p-4 rounded-xl bg-[#F8F4EE] border border-[#E2D7C6] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5E4B3C]">
                        {remainingForFreeShip === 0
                          ? 'Đơn hàng của bạn đã đủ điều kiện miễn phí vận chuyển tiêu chuẩn.'
                          : `Mua thêm ${formatVND(remainingForFreeShip)} để được miễn phí vận chuyển.`}
                      </span>
                      <span className="font-semibold text-[#073D63] tabular-nums">
                        {freeShipProgress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E2D7C6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#073D63] transition-all duration-300"
                        style={{ width: `${freeShipProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Cart Item List */}
                  <div className="divide-y divide-[#EFE8DD]">
                    {enrichedItems.map((item) => (
                      <div
                        key={`${item.product.id}-${item.variant.id}`}
                        className="py-4 flex gap-4"
                      >
                        <ResilientImage
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-20 h-20 rounded-lg object-contain p-1 border border-[#E2D7C6] shrink-0 bg-[#EFE8DD]"
                        />

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-[#2B2018] truncate">
                                {item.product.name}
                              </h3>
                              <p className="text-xs text-[#867363] mt-0.5 truncate">
                                {item.variant.label}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onRemoveItem(item.product.id, item.variant.id)
                              }
                              aria-label={`Xóa ${item.product.name}`}
                              className="text-[#867363] hover:text-[#9E3B2B] p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-4 mt-3">
                            <div className="inline-flex items-center border border-[#E2D7C6] rounded-lg bg-[#F8F4EE]">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    item.product.id,
                                    item.variant.id,
                                    -1
                                  )
                                }
                                aria-label="Giảm số lượng"
                                className="w-8 h-8 flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] rounded-l-lg cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-semibold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    item.product.id,
                                    item.variant.id,
                                    1
                                  )
                                }
                                aria-label="Tăng số lượng"
                                className="w-8 h-8 flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] rounded-r-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-sm font-semibold text-[#2B2018] tabular-nums">
                              {formatVND(item.lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Promo Code Box */}
                  <div className="pt-4 border-t border-[#EFE8DD] space-y-2.5">
                    <label
                      htmlFor={`${fieldId}-promo-code`}
                      className="block text-xs font-medium text-[#5E4B3C]"
                    >
                      Mã ưu đãi 
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`${fieldId}-promo-code`}
                        name="promoCode"
                        type="text"
                        autoComplete="off"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder={`Nhập ${SITE_CONFIG.announcement.promoCode} hoặc FREESHIP`}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] placeholder:text-[#867363] focus:outline-none focus:border-[#073D63]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromo()}
                        className="px-4 py-2 rounded-lg bg-[#EFE8DD] hover:bg-[#E2D7C6] text-xs font-semibold text-[#2B2018] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Áp dụng
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#867363]">
                      <span>Gợi ý nhanh:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyPromo(SITE_CONFIG.announcement.promoCode)
                        }
                        className="underline underline-offset-2 text-[#073D63] hover:text-[#5E3A1F] cursor-pointer"
                      >
                        {SITE_CONFIG.announcement.promoCode} (Giảm 10%)
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('FREESHIP')}
                        className="underline underline-offset-2 text-[#073D63] hover:text-[#5E3A1F] cursor-pointer"
                      >
                        FREESHIP (Miễn phí giao)
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-[#9E3B2B]">{promoError}</p>
                    )}
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-xs text-[#3F5E3B] font-medium">
                        <span>Đã áp dụng mã {appliedPromo}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedPromo(null);
                            setPromoInput('');
                          }}
                          className="underline cursor-pointer"
                        >
                          Gỡ mã
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form
              id="online-checkout-form"
              onSubmit={handlePlaceOrder}
              className="space-y-6"
            >
              {!customer && (
                <div className="rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] p-3 text-sm text-[#5E4B3C]">
                  Đăng nhập tài khoản để lưu đơn hàng lên Firebase và theo dõi trạng thái giao hàng.
                  <button
                    type="button"
                    onClick={onOpenAccount}
                    className="ml-1 font-semibold text-[#073D63] underline"
                  >
                    Đăng nhập
                  </button>
                </div>
              )}
              {/* Shipping Info */}
              <div className="space-y-3.5">
                <h3 className="font-serif text-lg font-semibold text-[#2B2018]">
                  1. Thông tin nhận hàng
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${fieldId}-full-name`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Họ và tên *
                    </label>
                    <input
                      id={`${fieldId}-full-name`}
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fullName: e.target.value }))
                      }
                      placeholder="Nguyễn Minh Anh"
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                    />
                    {formErrors.fullName && (
                      <p className="text-xs text-[#9E3B2B] mt-1">
                        {formErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-phone`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      id={`${fieldId}-phone`}
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="0912 345 678"
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                    />
                    {formErrors.phone && (
                      <p className="text-xs text-[#9E3B2B] mt-1">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${fieldId}-email`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Email nhận hóa đơn *
                    </label>
                    <input
                      id={`${fieldId}-email`}
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="minhanh@example.vn"
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                    />
                    {formErrors.email && (
                      <p className="text-xs text-[#9E3B2B] mt-1">
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-city`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                      Tỉnh / Thành phố
                    </label>
                    <select
                      id={`${fieldId}-city`}
                      name="address-level1"
                      autoComplete="address-level1"
                      value={form.city}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, city: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                    >
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Tỉnh thành khác">Tỉnh thành khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${fieldId}-address`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                    Địa chỉ giao hàng chi tiết *
                  </label>
                  <input
                    id={`${fieldId}-address`}
                    name="address"
                    type="text"
                    autoComplete="shipping street-address"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                    className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                  />
                  {formErrors.address && (
                    <p className="text-xs text-[#9E3B2B] mt-1">
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${fieldId}-delivery-note`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                    Ghi chú giao hàng hoặc gói quà
                  </label>
                  <input
                    id={`${fieldId}-delivery-note`}
                    name="deliveryNote"
                    type="text"
                    autoComplete="off"
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="Ví dụ: Giao giờ hành chính, gói giấy kraft quà tặng"
                    className="w-full px-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                  />
                </div>
              </div>

              {/* Shipping Method */}
              <div className="space-y-2.5 pt-2 border-t border-[#EFE8DD]">
                <h3 className="font-serif text-lg font-semibold text-[#2B2018]">
                  2. Hình thức vận chuyển
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, shippingMethod: 'standard' }))
                    }
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      form.shippingMethod === 'standard'
                        ? 'border-[#073D63] bg-[#EFE8DD]'
                        : 'border-[#E2D7C6] bg-[#F8F4EE]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#2B2018]">
                      Tiêu chuẩn (2–4 ngày)
                    </p>
                    <p className="text-xs text-[#5E4B3C] mt-0.5 tabular-nums">
                      {subtotal - discount >= FREE_SHIPPING_THRESHOLD ||
                      appliedPromo === 'FREESHIP'
                        ? 'Miễn phí'
                        : '35.000₫'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, shippingMethod: 'express' }))
                    }
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      form.shippingMethod === 'express'
                        ? 'border-[#073D63] bg-[#EFE8DD]'
                        : 'border-[#E2D7C6] bg-[#F8F4EE]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#2B2018]">
                      Hỏa tốc (trong 4 giờ)
                    </p>
                    <p className="text-xs text-[#5E4B3C] mt-0.5 tabular-nums">
                      65.000₫
                    </p>
                  </button>
                </div>
              </div>

              {/* Online Payment Methods */}
              <div className="space-y-3 pt-2 border-t border-[#EFE8DD]">
                <h3 className="font-serif text-lg font-semibold text-[#2B2018]">
                  3. Phương thức thanh toán
                </h3>

                <div className="space-y-2">
                  {paymentOptions.map((option) => {
                    const active = form.paymentMethod === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, paymentMethod: option.id }))
                        }
                        className={`w-full p-3.5 rounded-lg border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                          active
                            ? 'border-[#073D63] bg-[#EFE8DD]'
                            : 'border-[#E2D7C6] bg-[#F8F4EE] hover:bg-[#EFE8DD]/50'
                        }`}
                      >
                        <div
                          className={`mt-0.5 ${
                            active ? 'text-[#073D63]' : 'text-[#867363]'
                          }`}
                        >
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#2B2018]">
                            {option.title}
                          </p>
                          <p className="text-xs text-[#5E4B3C] mt-0.5">
                            {option.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Method-Specific Interactive Panels */}
                {form.paymentMethod === 'vietqr' && (
                  <div className="rounded-xl border border-[#E2D7C6] bg-[#F8F4EE] p-4 text-sm text-[#5E4B3C]">
                    QR chỉ được tạo sau khi đơn hàng đã lưu thành công. Hãy nhấn
                    “Tạo đơn”, sau đó quét mã ở màn hình xác nhận để hệ thống có
                    thể đối chiếu giao dịch với đúng đơn hàng.
                  </div>
                )}

                {form.paymentMethod === 'card' && (
                  <div className="p-4 rounded-xl bg-[#F8F4EE] border border-[#E2D7C6] space-y-3">
                    <div>
                      <label htmlFor={`${fieldId}-card-number`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                        Số thẻ ATM / Visa / Mastercard
                      </label>
                      <input
                        id={`${fieldId}-card-number`}
                        name="cardNumber"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={form.cardNumber}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cardNumber: formatCardNumber(e.target.value),
                          }))
                        }
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3 py-2 rounded-lg bg-[#FCF9F5] border border-[#E2D7C6] font-mono text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                      />
                      {formErrors.cardNumber && (
                        <p className="text-xs text-[#9E3B2B] mt-1">
                          {formErrors.cardNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`${fieldId}-card-holder`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                        Tên chủ thẻ (không dấu)
                      </label>
                      <input
                        id={`${fieldId}-card-holder`}
                        name="cardHolder"
                        type="text"
                        autoComplete="cc-name"
                        value={form.cardHolder}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cardHolder: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="NGUYEN MINH ANH"
                        className="w-full px-3 py-2 rounded-lg bg-[#FCF9F5] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                      />
                      {formErrors.cardHolder && (
                        <p className="text-xs text-[#9E3B2B] mt-1">
                          {formErrors.cardHolder}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`${fieldId}-card-expiry`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                          Hết hạn (MM/YY)
                        </label>
                        <input
                          id={`${fieldId}-card-expiry`}
                          name="cardExpiry"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={form.cardExpiry}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              cardExpiry: formatCardExpiry(e.target.value),
                            }))
                          }
                          placeholder="08/29"
                          className="w-full px-3 py-2 rounded-lg bg-[#FCF9F5] border border-[#E2D7C6] font-mono text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                        />
                        {formErrors.cardExpiry && (
                          <p className="text-xs text-[#9E3B2B] mt-1">
                            {formErrors.cardExpiry}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-card-cvv`} className="block text-xs font-medium text-[#5E4B3C] mb-1">
                          Mã bảo mật CVV
                        </label>
                        <input
                          id={`${fieldId}-card-cvv`}
                          name="cardCvv"
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          maxLength={4}
                          value={form.cardCvv}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              cardCvv: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          placeholder="123"
                          className="w-full px-3 py-2 rounded-lg bg-[#FCF9F5] border border-[#E2D7C6] font-mono text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
                        />
                        {formErrors.cardCvv && (
                          <p className="text-xs text-[#9E3B2B] mt-1">
                            {formErrors.cardCvv}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {form.paymentMethod === 'ewallet' && (
                  <div className="p-4 rounded-xl bg-[#F8F4EE] border border-[#E2D7C6] space-y-3">
                    <p className="text-xs font-medium text-[#5E4B3C]">
                      Chọn ví điện tử thanh toán:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, ewalletProvider: 'momo' }))
                        }
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium cursor-pointer ${
                          form.ewalletProvider === 'momo'
                            ? 'border-[#073D63] bg-[#EFE8DD] text-[#2B2018]'
                            : 'border-[#E2D7C6] bg-[#FCF9F5] text-[#5E4B3C]'
                        }`}
                      >
                        Ví MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, ewalletProvider: 'vnpay' }))
                        }
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium cursor-pointer ${
                          form.ewalletProvider === 'vnpay'
                            ? 'border-[#073D63] bg-[#EFE8DD] text-[#2B2018]'
                            : 'border-[#E2D7C6] bg-[#FCF9F5] text-[#5E4B3C]'
                        }`}
                      >
                        VNPay QR
                      </button>
                    </div>
                    <p className="text-xs text-[#5E4B3C]">
                      Hệ thống sẽ liên kết trực tiếp với ứng dụng{' '}
                      {form.ewalletProvider === 'momo' ? 'MoMo' : 'VNPay'} khi bạn bấm xác nhận thanh toán.
                    </p>
                  </div>
                )}

                {form.paymentMethod === 'cod' && (
                  <div className="p-4 rounded-xl bg-[#F8F4EE] border border-[#E2D7C6] text-xs text-[#5E4B3C] leading-relaxed">
                    Bạn được quyền mở hộp kiểm tra tình trạng nguyên vẹn của gốm, mây tre hoặc gỗ mỹ nghệ trước khi thanh toán tiền mặt{' '}
                    <strong className="text-[#2B2018] tabular-nums">
                      {formatVND(finalTotal)}
                    </strong>{' '}
                    cho bưu tá.
                  </div>
                )}
                <p className="text-xs text-[#867363]">
                  Chuyển khoản VietQR được quản trị viên kiểm tra thủ công; thanh toán thẻ/ví chưa được kết nối.
                </p>
              </div>
            </form>
          )}

          {step === 'receipt' && receiptOrder && (
            <div className="space-y-6 py-2">
              <div className="p-5 rounded-xl bg-[#F8F4EE] border border-[#E2D7C6] space-y-3">
                <div className="flex items-center gap-2.5 text-[#3F5E3B]">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide">
                    {receiptOrder.paymentStatus === 'paid'
                      ? 'Đã thanh toán'
                      : receiptOrder.paymentStatus}
                    </p>
                    <h3 className="font-serif text-2xl font-semibold text-[#2B2018]">
                      Đơn hàng #{receiptOrder.orderNumber}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-[#5E4B3C]">
                  {receiptOrder.orderStatus}. Dự kiến giao đến{' '}
                  <strong className="text-[#2B2018]">
                    {receiptOrder.city}
                  </strong>{' '}
                  vào ngày{' '}
                  <strong className="text-[#2B2018]">
                    {receiptOrder.estimatedDelivery}
                  </strong>
                  .
                </p>
              </div>

              {receiptOrder.paymentMethod === 'vietqr' && (
                <div className="rounded-xl border border-[#E2D7C6] bg-[#F8F4EE] p-4">
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    {!qrImageFailed && receiptOrder.paymentReference ? (
                      <img
                        src={`https://img.vietqr.io/image/${encodeURIComponent(VIETQR_BANK_BIN)}-${encodeURIComponent(VIETQR_ACCOUNT_NUMBER)}-compact2.png?amount=${Math.round(receiptOrder.total)}&addInfo=${encodeURIComponent(receiptOrder.paymentReference)}&accountName=${encodeURIComponent(VIETQR_ACCOUNT_NAME)}`}
                        alt="Mã QR chuyển khoản VietQR"
                        onError={() => setQrImageFailed(true)}
                        className="h-40 w-40 shrink-0 rounded-lg border border-[#E2D7C6] bg-white object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg border border-[#E2D7C6] bg-white p-3 text-center text-xs text-[#9E3B2B]">
                        'Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.'
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5 text-xs text-[#5E4B3C]">
                      <p className="text-sm font-semibold text-[#2B2018]">
                        {VIETQR_BANK_NAME}
                      </p>
                      <p>
                        Mã ngân hàng: {VIETQR_BANK_BIN}
                        <button
                          type="button"
                          aria-label="Sao chép mã ngân hàng"
                          onClick={() => void handleCopyValue('bin', VIETQR_BANK_BIN)}
                          className="ml-2 inline-flex items-center gap-1 text-[#073D63]"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedRef === 'bin' ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </p>
                      <p>
                        Chi nhánh: {PAYMENT_CONFIG.vietqr.branch}
                      </p>
                      <p>
                        Số tài khoản: {VIETQR_ACCOUNT_NUMBER}
                        <button
                          type="button"
                          aria-label="Sao chép số tài khoản"
                          onClick={() =>
                            void handleCopyValue('account', VIETQR_ACCOUNT_NUMBER)
                          }
                          className="ml-2 inline-flex items-center gap-1 text-[#073D63]"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedRef === 'account' ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </p>
                      <p>
                        Chủ tài khoản: {VIETQR_ACCOUNT_NAME}
                        <button
                          type="button"
                          aria-label="Sao chép tên chủ tài khoản"
                          onClick={() =>
                            void handleCopyValue('accountName', VIETQR_ACCOUNT_NAME)
                          }
                          className="ml-2 inline-flex items-center gap-1 text-[#073D63]"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedRef === 'accountName'
                            ? 'Đã sao chép'
                            : 'Sao chép'}
                        </button>
                      </p>
                      <p>
                        Số tiền:{' '}
                        <strong className="text-[#073D63]">
                          {formatVND(receiptOrder.total)}
                        </strong>
                      </p>
                      <p className="font-mono text-[#2B2018]">
                        Nội dung CK: {receiptOrder.paymentReference}
                        <button
                          type="button"
                          aria-label="Sao chép nội dung chuyển khoản"
                          onClick={() =>
                            void handleCopyValue(
                              'reference',
                              receiptOrder.paymentReference ?? ''
                            )
                          }
                          className="ml-2 inline-flex items-center gap-1 font-sans text-[#073D63]"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedRef === 'reference'
                            ? 'Đã sao chép'
                            : 'Sao chép'}
                        </button>
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCopyTransfer(receiptOrder)}
                        className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#073D63] hover:text-[#5E3A1F] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>
                          {copiedRef
                            ? 'Đã sao chép thông tin'
                            : 'Sao chép thông tin chuyển khoản'}
                        </span>
                      </button>
                      {copyError && (
                        <p role="alert" className="text-[#9E3B2B]">
                          {copyError}
                        </p>
                      )}
                      <p className="text-[#867363]">
                        {receiptOrder.paymentStatus === 'paid'
                          ? 'Giao dịch đã được cửa hàng xác nhận.'
                          : receiptOrder.paymentStatus === 'awaiting_confirmation'
                            ? 'Cửa hàng đang đối chiếu giao dịch. Trạng thái sẽ cập nhật tại đây.'
                            : 'Sau khi chuyển khoản, hãy bấm “Tôi đã thanh toán” để cửa hàng kiểm tra giao dịch.'}
                      </p>
                      {receiptOrder.paymentStatus === 'pending_payment' && (
                        <button
                          type="button"
                          disabled={paymentSubmitting}
                          onClick={() => void handleMarkPaymentSent(receiptOrder)}
                          className="mt-2 w-full rounded-lg bg-[#073D63] px-4 py-2.5 text-sm font-medium text-[#FCF9F5] hover:bg-[#0B527F] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {paymentSubmitting
                            ? 'Đang gửi thông báo...'
                            : 'Tôi đã thanh toán'}
                        </button>
                      )}
                      {paymentSubmitError && (
                        <p role="alert" className="text-[#9E3B2B]">
                          {paymentSubmitError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <p className="font-semibold text-[#2B2018]">
                  Chi tiết người nhận
                </p>
                <div className="p-4 rounded-xl border border-[#E2D7C6] space-y-1.5 text-xs text-[#5E4B3C]">
                  <p>
                    <span className="text-[#867363]">Người nhận:</span>{' '}
                    <strong className="text-[#2B2018]">
                      {receiptOrder.customerName}
                    </strong>{' '}
                    · {receiptOrder.phone}
                  </p>
                  <p>
                    <span className="text-[#867363]">Địa chỉ:</span>{' '}
                    {formatAddressWithCity(receiptOrder.address, receiptOrder.city)}
                  </p>
                  <p>
                    <span className="text-[#867363]">Email hóa đơn:</span>{' '}
                    {receiptOrder.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#2B2018]">
                  Sản phẩm đã đặt
                </p>
                <div className="divide-y divide-[#EFE8DD] border border-[#E2D7C6] rounded-xl px-4">
                  {receiptOrder.items.map((item, idx) => (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#2B2018] truncate">
                          {item.name} × {item.quantity}
                        </p>
                        <p className="text-[#867363] truncate">
                          {item.variantLabel}
                        </p>
                      </div>
                      <span className="font-semibold text-[#2B2018] tabular-nums shrink-0">
                        {formatVND(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="py-3 flex items-center justify-between text-sm font-semibold text-[#2B2018]">
                    <span>Tổng thanh toán</span>
                    <span className="text-[#073D63] tabular-nums">
                      {formatVND(receiptOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrderHistory();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#073D63] text-[#073D63] hover:bg-[#EFE8DD] text-sm font-medium transition-colors cursor-pointer"
                >
                  Xem lịch sử đơn hàng
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors cursor-pointer"
                >
                  Tiếp tục mua sắm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Drawer Summary Footer */}
        {step !== 'receipt' && enrichedItems.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E2D7C6] bg-[#F8F4EE] space-y-3">
            <div className="space-y-1.5 text-xs text-[#5E4B3C]">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="tabular-nums font-medium text-[#2B2018]">
                  {formatVND(subtotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#3F5E3B]">
                  <span>Ưu đãi ({appliedPromo})</span>
                  <span className="tabular-nums font-medium">
                    -{formatVND(discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí vận chuyển</span>
                <span className="tabular-nums font-medium text-[#2B2018]">
                  {shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E2D7C6] flex justify-between text-base font-semibold text-[#2B2018]">
                <span>Tổng cộng</span>
                <span className="text-[#073D63] tabular-nums">
                  {formatVND(finalTotal)}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => onChangeStep('checkout')}
                className="w-full py-3 px-4 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors cursor-pointer"
              >
                Đặt hàng
              </button>
            ) : (
              <>
                {orderError && (
                  <p role="alert" className="text-xs text-[#9E3B2B]">
                    {orderError}
                  </p>
                )}
                <button
                  type="submit"
                  form="online-checkout-form"
                  disabled={
                    orderBusy ||
                    (form.paymentMethod === 'vietqr' &&
                      (!VIETQR_BANK_BIN ||
                        !VIETQR_ACCOUNT_NUMBER ||
                        !VIETQR_ACCOUNT_NAME))
                  }
                  className="w-full py-3 px-4 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer tabular-nums disabled:cursor-wait disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {orderBusy
                      ? 'Đang lưu đơn hàng...'
                      : form.paymentMethod === 'cod'
                        ? `Xác nhận đặt hàng COD · ${formatVND(finalTotal)}`
                        : `Tạo đơn & hiển thị mã QR · ${formatVND(finalTotal)}`}
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
