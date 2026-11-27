import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';
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
                {SITE_CONFIG.brandName} - {SITE_CONFIG.legalName}
              </p>

              <h1
                className="font-bold text-[#2B2018] leading-[1.15] tracking-tight"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 3.1rem)' }}
              >
                {SITE_CONFIG.hero.heading}
              </h1>

              <p className="text-base leading-relaxed text-[#5E4B3C] max-w-md">
                {SITE_CONFIG.hero.description}
              </p>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                <button
                  type="button"
                  onClick={onExploreClick}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073D63]"
                >
                  <span>{SITE_CONFIG.hero.exploreLabel} </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#lang-nghe"
                  className="text-sm font-medium text-[#5E4B3C] hover:text-[#2B2018] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  {SITE_CONFIG.hero.aboutLabel}
                </a>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#E2D7C6] grid grid-cols-3 gap-3 md:gap-4">
              {SITE_CONFIG.hero.stats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <p className="font-serif text-base font-semibold leading-tight text-[#2B2018] tabular-nums sm:text-lg md:text-xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 break-words text-[11px] leading-snug text-[#867363] sm:text-xs">
                    {stat.label}
                  </p>
                </div>
              ))}
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
                      alt={`Hình ảnh giới thiệu ${SITE_CONFIG.brandName} ${index + 1}`}
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
