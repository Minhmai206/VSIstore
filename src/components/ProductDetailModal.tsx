import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minus,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { Product } from '../types/shop';
import { formatVND } from '../utils/format';
import { ResilientImage } from './ResilientImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variantId: string, quantity: number) => void;
  onBuyNow: (product: Product, variantId: string, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('contain');
  const [storyExpanded, setStoryExpanded] = useState(false);

  const imagesList = useMemo(() => {
    if (!product) return [];
    const list = [product.image, ...(product.galleryImages ?? [])].filter(Boolean);
    return Array.from(new Set(list));
  }, [product]);

  useEffect(() => {
    if (product) {
      setSelectedVariantId(product.variants[0]?.id ?? '');
      setActiveImage(product.image);
      setQuantity(1);
      setAddedFeedback(false);
      setFitMode('cover');
      setStoryExpanded(false);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) ??
    product.variants[0];
  const unitPrice = product.price + (activeVariant?.priceDelta ?? 0);
  const specifications = (product.specifications ?? []).filter(
    ({ label, value }) => label.trim() && value.trim()
  );
  const displaySpecifications =
    specifications.length > 0
      ? specifications
      : [
          ...(product.dimensions.trim()
            ? [{ label: 'Kích thước', value: product.dimensions }]
            : []),
          ...(product.weight?.trim()
            ? [{ label: 'Khối lượng', value: product.weight }]
            : []),
          ...(product.artisanName.trim()
            ? [{ label: 'Nghệ nhân / Xưởng', value: product.artisanName }]
            : []),
        ];

  const handleAdd = () => {
    if (!activeVariant) return;
    onAddToCart(product, activeVariant.id, quantity);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1500);
  };

  const handleImmediateBuy = () => {
    if (!activeVariant) return;
    onBuyNow(product, activeVariant.id, quantity);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2018]/50 backdrop-blur-xs p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết sản phẩm"
          className="absolute right-4 top-4 z-10 w-10 h-10 rounded-lg bg-[#FCF9F5]/90 border border-[#E2D7C6] text-[#2B2018] hover:bg-[#EFE8DD] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Imagery Gallery & Technical Provenance */}
          <div className="md:col-span-6 bg-[#EFE8DD]/60 p-6 md:p-8 flex flex-col justify-between gap-5 border-b md:border-b-0 md:border-r border-[#E2D7C6]">
            <div className="space-y-3">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E2D7C6] bg-[#EFE8DD] group">
                <ResilientImage
                  src={activeImage || product.image}
                  alt={product.name}
                  fallbackTitle={product.name}
                  className={`w-full h-full object-center transition-all duration-300 ${
                    fitMode === 'cover' ? 'object-cover' : 'object-contain p-2'
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))
                  }
                  title={
                    fitMode === 'cover'
                      ? 'Xem trọn vẹn toàn bộ sản phẩm'
                      : 'Phóng tràn khung ảnh'
                  }
                  className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FCF9F5]/90 hover:bg-[#FCF9F5] border border-[#E2D7C6] text-[11px] font-medium text-[#2B2018] shadow-xs cursor-pointer transition-opacity opacity-90 hover:opacity-100"
                >
                  <Maximize2 className="w-3 h-3 text-[#073D63]" />
                  <span>{fitMode === 'cover' ? 'Xem toàn ảnh' : 'Tràn khung'}</span>
                </button>
              </div>

              {imagesList.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {imagesList.map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl.slice(0, 32)}-${idx}`}
                      type="button"
                      onClick={() => setActiveImage(imgUrl)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border bg-[#EFE8DD] shrink-0 cursor-pointer transition-all ${
                        (activeImage || product.image) === imgUrl
                          ? 'border-[#073D63] ring-1 ring-[#073D63]'
                          : 'border-[#E2D7C6] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={imgUrl}
                        alt={`${product.name} góc nhìn ${idx + 1}`}
                        className="w-full h-full object-contain p-1 object-center"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-xs text-[#5E4B3C]">
              <div className="flex justify-between gap-4 py-2 border-b border-[#E2D7C6]">
                <span className="text-[#867363]">Mã tác phẩm</span>
                <span className="font-medium text-[#2B2018] tabular-nums">
                  {product.sku}
                </span>
              </div>
              {displaySpecifications.map((specification, index) => (
                <div
                  key={`${specification.label}-${index}`}
                  className="flex justify-between gap-4 py-2 border-b border-[#E2D7C6]"
                >
                  <span className="text-[#867363]">{specification.label}</span>
                  <span
                    className="font-medium text-[#2B2018] text-right tabular-nums"
                  >
                    {specification.value}
                  </span>
                </div>
              ))}
              <div className="pt-1">
                <span className="text-[#867363] block mb-1">Hướng dẫn bảo quản</span>
                <p className="leading-relaxed text-[#2B2018]">{product.careGuide}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-[#867363] pr-10">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span> {product.village}</span>
                <span aria-hidden="true">·</span>
                <span>{product.material}</span>
              </div>

              <h2
                id="pdp-title"
                className="text-2xl md:text-3xl font-bold text-[#2B2018] leading-tight tracking-tight"
              >
                {product.name}
              </h2>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-2.5">
                  <p className="text-2xl font-bold text-[#073D63] tabular-nums">
                    {formatVND(unitPrice)}
                  </p>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <p className="text-sm text-[#867363] line-through tabular-nums">
                      {formatVND(product.originalPrice + (activeVariant?.priceDelta ?? 0))}
                    </p>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs text-[#5E4B3C] tabular-nums">
                  <Star className="w-4 h-4 fill-[#073D63] text-[#073D63]" />
                  <span className="font-semibold text-[#2B2018]">
                    {product.rating.toFixed(1)}
                  </span>
                  <span>({product.reviewCount} đánh giá)</span>
                </div>
              </div>

              <div>
                <p
                  className={`text-sm leading-relaxed text-[#5E4B3C] ${
                    storyExpanded
                      ? 'max-h-40 overflow-y-auto overscroll-contain pr-2'
                      : 'line-clamp-3'
                  }`}
                  style={
                    storyExpanded
                      ? { scrollbarWidth: 'thin', scrollbarColor: '#B9A792 #EFE8DD' }
                      : undefined
                  }
                >
                  {product.story}
                </p>
                {product.story.trim().length > 0 && (
                  <button
                    type="button"
                    aria-expanded={storyExpanded}
                    onClick={() => setStoryExpanded((expanded) => !expanded)}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#073D63] transition-colors hover:text-[#5E3A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073D63]"
                  >
                    {storyExpanded ? (
                      <>
                        <span>Thu gọn</span>
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <span>Xem thêm</span>
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Variant Selector */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#2B2018]">
                    Chọn phiên bản chế tác
                  </span>
                  <span className="text-[#867363] tabular-nums">
                    Còn {activeVariant?.stock ?? 0} sản phẩm
                  </span>
                </div>
                <div className="space-y-2">
                  {product.variants.map((variant) => {
                    const selected = variant.id === activeVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#073D63] bg-[#EFE8DD]'
                            : 'border-[#E2D7C6] bg-[#F8F4EE] hover:bg-[#EFE8DD]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full border border-[#D7C9B4] shrink-0"
                            style={{ backgroundColor: variant.colorHex }}
                          />
                          <span className="text-sm font-medium text-[#2B2018]">
                            {variant.label}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[#5E4B3C] tabular-nums">
                          {variant.priceDelta > 0
                            ? `+${formatVND(variant.priceDelta)}`
                            : 'Tiêu chuẩn'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quantity & Primary Purchase CTAs */}
            <div className="pt-4 border-t border-[#E2D7C6] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#2B2018]">Số lượng</span>
                <div className="inline-flex items-center border border-[#E2D7C6] rounded-lg bg-[#F8F4EE]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Giảm số lượng"
                    className="w-10 h-10 flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] rounded-l-lg cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(Math.max(1, activeVariant?.stock ?? 10), q + 1)
                      )
                    }
                    aria-label="Tăng số lượng"
                    className="w-10 h-10 flex items-center justify-center text-[#2B2018] hover:bg-[#EFE8DD] rounded-r-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!product.inStock}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    addedFeedback
                      ? 'border-[#3F5E3B] bg-[#3F5E3B] text-[#FCF9F5]'
                      : 'border-[#073D63] text-[#073D63] hover:bg-[#EFE8DD]'
                  }`}
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đã thêm vào giỏ</span>
                    </>
                  ) : (
                    <span>Thêm vào giỏ hàng</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleImmediateBuy}
                  disabled={!product.inStock}
                  className="px-4 py-3 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors cursor-pointer tabular-nums disabled:opacity-50"
                >
                  Thanh toán ngay · {formatVND(unitPrice * quantity)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}