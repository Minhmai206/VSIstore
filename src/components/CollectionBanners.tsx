import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COLLECTION_BANNER_IMAGES } from '../data/products';
import { ResilientImage } from './ResilientImage';

export function CollectionBanners() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % COLLECTION_BANNER_IMAGES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused]);

  const goTo = (index: number) => {
    setActiveIndex(
      (index + COLLECTION_BANNER_IMAGES.length) % COLLECTION_BANNER_IMAGES.length
    );
  };

  return (
    <section
      aria-label="Bộ sưu tập nổi bật"
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-[#E2D7C6] bg-[#EFE8DD]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        const nextFocusedElement = event.relatedTarget;
        if (
          !(nextFocusedElement instanceof Node) ||
          !event.currentTarget.contains(nextFocusedElement)
        ) {
          setPaused(false);
        }
      }}
    >
      <div
        className="relative aspect-video w-full"
        aria-roledescription="carousel"
        aria-label="Hình ảnh sản phẩm thủ công"
      >
        <div
          className="flex h-full w-[300%] transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          style={{
            transform: `translateX(-${(activeIndex * 100) / COLLECTION_BANNER_IMAGES.length}%)`,
          }}
          aria-live="off"
        >
          {COLLECTION_BANNER_IMAGES.map((image, index) => (
          <div
            key={image}
              className="relative h-full w-1/3 shrink-0 overflow-hidden"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${COLLECTION_BANNER_IMAGES.length}`}
          >
            <ResilientImage
              src={image}
                alt={`Hình ảnh bộ sưu tập nổi bật ${index + 1}`}
                className="h-full w-full object-contain object-center"
            />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2B2018]/25 via-transparent to-transparent" />
          </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Ảnh bộ sưu tập trước"
          className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-[#2B2018]/35 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-[#2B2018]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-8"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Ảnh bộ sưu tập tiếp theo"
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-[#2B2018]/35 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-[#2B2018]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:right-20"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {COLLECTION_BANNER_IMAGES.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Hiển thị ảnh bộ sưu tập ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={`h-2.5 rounded-full border border-white/80 shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                activeIndex === index
                  ? 'w-7 bg-white'
                  : 'w-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
