import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { HERO_IMAGES } from '../data/products';
import { ResilientImage } from './ResilientImage';

interface HeroProps {
  onExploreClick: () => void;
}

export function Hero({ onExploreClick }: HeroProps) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % HERO_IMAGES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      id="top"
      className="border-b border-[#E2D7C6] bg-white/35"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between py-2">
            <div className="space-y-6">
              <p className="text-xs font-medium tracking-wider text-[#867363]">
                VSI - CÔNG TY TNHH GIÁO DỤC ĐỔI MỚI SÁNG TẠO STEM VIỆT NAM
              </p>

              <h1
                className="font-bold text-[#2B2018] leading-[1.15] tracking-tight"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 3.1rem)' }}
              >
              GIÁO DỤC ĐỔI MỚI SÁNG TẠO STEM VIỆT NAM
              </h1>

              <p className="text-base leading-relaxed text-[#5E4B3C] max-w-md">
                Mỗi sản phẩm đều góp phần đem lại sự sáng tạo khi sử dụng, góp phần đem lại kiến thức về công nghệ và thủ công trong thời đại số.
              </p>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                <button
                  type="button"
                  onClick={onExploreClick}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073D63]"
                >
                  <span>Khám Phá Sản Phẩm </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#lang-nghe"
                  className="text-sm font-medium text-[#5E4B3C] hover:text-[#2B2018] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  Giới thiệu về VSI 
                </a>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#E2D7C6] grid grid-cols-3 gap-4">
              <div>
                <p className="font-serif text-2xl font-semibold text-[#2B2018] tabular-nums">
                  Các Sản Phẩm
                </p>
                <p className="text-xs text-[#867363] mt-0.5">
                  Đảm bảo chất lượng
                </p>
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-[#2B2018] tabular-nums">
                  100% Nguyên Liệu
                </p>
                <p className="text-xs text-[#867363] mt-0.5">
                  Hoạt động vì môi trường
                </p>
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-[#2B2018] tabular-nums">
                  Từ 1,5 triệu
                </p>
                <p className="text-xs text-[#867363] mt-0.5">
                  Miễn phí giao toàn quốc
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#E2D7C6] bg-[#EFE8DD]"
              aria-roledescription="carousel"
              aria-label="Hình ảnh giới thiệu"
            >
              <div
                className="flex h-full w-[300%] transition-transform duration-700 ease-in-out motion-reduce:transition-none"
                style={{ transform: `translateX(-${(activeImage * 100) / HERO_IMAGES.length}%)` }}
              >
                {HERO_IMAGES.map((image, index) => (
                  <div key={image} className="h-full w-1/3 shrink-0">
                    <ResilientImage
                      src={image}
                      alt={`Hình ảnh giới thiệu VSI ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {HERO_IMAGES.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    aria-label={`Hiển thị ảnh ${index + 1}`}
                    aria-pressed={activeImage === index}
                    onClick={() => setActiveImage(index)}
                    className={`h-2.5 w-2.5 rounded-full border border-white/80 transition-colors cursor-pointer ${
                      activeImage === index ? 'bg-white' : 'bg-black/25'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
