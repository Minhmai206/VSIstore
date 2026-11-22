import { X } from 'lucide-react';

interface TopBannerProps {
  visible: boolean;
  onDismiss: () => void;
  onActionClick: () => void;
}

export function TopBanner({
  visible,
  onDismiss,
  onActionClick,
}: TopBannerProps) {
  if (!visible) return null;

  return (
    <div className="bg-[#F2AB15] text-[#073D63] border-b border-[#D99500]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-10 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <p className="truncate font-medium">
            Ưu đãi mùa thủ công: Nhập mã{' '}
            <span className="font-semibold underline underline-offset-2">
              MOCDAT10
            </span>{' '}
            giảm 10% · Miễn phí vận chuyển toàn quốc cho đơn từ 1.500.000₫
          </p>
          <button
            type="button"
            onClick={onActionClick}
            className="hidden sm:inline-flex items-center font-semibold text-[#073D63] hover:text-[#2B2018] underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Xem bộ sưu tập
          </button>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng banner ưu đãi"
          className="p-1 rounded hover:bg-[#D99500] text-[#073D63] hover:text-[#2B2018] transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
