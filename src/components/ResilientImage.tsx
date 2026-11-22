import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  // Tự động reset trạng thái lỗi khi admin chọn hoặc thay đổi sang ảnh mới
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EFE8DD] via-[#E7DDD0] to-[#DDD0BE] text-[#5E4B3C] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        <span className="font-serif text-base font-medium text-[#2B2018]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setHasError(true)}
      className={`object-center select-none ${className}`}
    />
  );
}