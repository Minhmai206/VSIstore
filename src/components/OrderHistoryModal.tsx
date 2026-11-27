import { useEffect } from 'react';
import { CheckCircle2, PackageCheck, X } from 'lucide-react';
import { Order } from '../types/shop';
import {
  formatAddressWithCity,
  formatOrderDate,
  formatVND,
} from '../utils/format';

const TRACKING_STEPS = [
  'Chờ xác nhận',
  'Đang đóng gói chống sốc',
  'Đang giao hàng',
  'Hoàn tất',
] as const;

interface OrderHistoryModalProps {
  isOpen: boolean;
  orders: Order[];
  onClose: () => void;
}

export function OrderHistoryModal({
  isOpen,
  orders,
  onClose,
}: OrderHistoryModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2018]/50 backdrop-blur-xs p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Lịch sử đơn hàng"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E2D7C6] bg-[#F8F4EE] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#2B2018]">
              Đơn Hàng Đã Đặt
            </h2>
            <p className="text-xs text-[#867363]">
              Danh sách sản phẩm đã mua và tiến trình giao hàng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng lịch sử đơn hàng"
            className="w-9 h-9 rounded-lg border border-[#E2D7C6] flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {orders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <PackageCheck
                className="w-10 h-10 text-[#867363] mx-auto"
                strokeWidth={1.5}
              />
              <p className="font-serif text-xl font-semibold text-[#2B2018]">
                Chưa có đơn hàng nào
              </p>
              <p className="text-sm text-[#5E4B3C]">
                Sau khi hoàn tất thanh toán trực tuyến hoặc đặt hàng COD, biên nhận điện tử sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentStep = TRACKING_STEPS.findIndex(
                (status) => status === order.orderStatus
              );
              const isCancelled = order.orderStatus === 'Đã hủy';
              const progressStep =
                currentStep >= 0
                  ? currentStep
                  : order.orderStatus.includes('đóng gói')
                    ? 1
                    : order.orderStatus.includes('giao hàng')
                      ? 2
                      : -1;
              return (
                <div
                  key={order.orderNumber}
                  className="p-5 rounded-xl bg-[#F8F4EE] border border-[#E2D7C6] space-y-3"
                >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2D7C6]">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#2B2018]">
                      #{order.orderNumber}
                    </p>
                    <p className="text-xs text-[#867363]">
                      Đặt lúc {formatOrderDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F5E3B]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {order.paymentStatus === 'awaiting_admin_review'
                        ? 'Chờ cửa hàng xác nhận giá và tồn kho'
                        : order.paymentStatus === 'pending_payment'
                        ? 'Chờ thanh toán'
                        : order.paymentStatus === 'awaiting_confirmation'
                          ? 'Chờ cửa hàng xác nhận'
                          : order.paymentStatus === 'paid'
                            ? 'Đã thanh toán'
                            : order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#5E4B3C]">
                  {order.items.map((item, idx) => (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="flex justify-between gap-4"
                    >
                      <span className="text-[#2B2018]">
                        {item.name} ({item.variantLabel}) × {item.quantity}
                      </span>
                      {order.paymentStatus !== 'awaiting_admin_review' && (
                        <span className="tabular-nums font-medium text-[#2B2018] shrink-0">
                          {formatVND(item.unitPrice * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E2D7C6] pt-3">
                  <p className="mb-2 text-xs font-semibold text-[#2B2018]">
                    Theo dõi đơn hàng
                  </p>
                  {isCancelled ? (
                    <p className="text-sm font-medium text-[#9E3B2B]">
                      Đơn hàng đã bị hủy
                    </p>
                  ) : (
                    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TRACKING_STEPS.map((status, index) => {
                        const complete = index <= progressStep;
                        return (
                          <li
                            key={status}
                            className={`rounded-lg border px-2.5 py-2 text-xs ${
                              complete
                                ? 'border-[#073D63] bg-[#073D63]/5 text-[#073D63]'
                                : 'border-[#E2D7C6] text-[#867363]'
                            }`}
                          >
                            <span className="mr-1 font-semibold">
                              {complete ? '✓' : `${index + 1}.`}
                            </span>
                            {status}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {progressStep < 0 && !isCancelled && (
                    <p className="mt-2 text-xs text-[#867363]">
                      Trạng thái đơn hiện tại: {order.orderStatus}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E2D7C6] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#5E4B3C]">
                    Giao đến:{' '}
                    {formatAddressWithCity(order.address, order.city)}
                    {order.estimatedDelivery
                      ? ` · Dự kiến ${order.estimatedDelivery}`
                      : ' · Chờ xác nhận thời gian giao'}
                  </span>
                  {order.paymentStatus === 'awaiting_admin_review' ? (
                    <span className="text-xs text-[#867363]">
                      Cửa hàng sẽ xác nhận giá và tồn kho trước khi thanh toán.
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-[#073D63] tabular-nums">
                        Tiền hàng: {formatVND(order.subtotal ?? order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
                      </span>
                      {(order.discount ?? 0) > 0 && (
                        <span className="text-xs tabular-nums text-[#5E4B3C]">
                          Giảm: {formatVND(order.discount ?? 0)}
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-[#5E4B3C]">
                        Phí ship: {formatVND(order.shippingFee ?? 35000)}
                      </span>
                      <span className="text-sm font-semibold text-[#073D63] tabular-nums">
                        Tổng: {formatVND(order.total)}
                      </span>
                    </>
                  )}
                </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
