import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Quote,
  Star,
} from 'lucide-react';
import { CRAFT_REVIEWS, WORKSHOP_IMAGE } from '../data/products';
import { SITE_CONFIG } from '../config/site';
import { CraftReview } from '../types/shop';
import { ResilientImage } from './ResilientImage';

const CRAFT_VIDEO_URL =
  import.meta.env.VITE_CRAFT_VIDEO_URL?.trim() || 'https://youtu.be/kvyCnjAgNuE';

type VideoSource =
  | { kind: 'embed'; src: string; poster?: string }
  | { kind: 'file'; src: string }
  | { kind: 'unsupported'; src: string };

function getVideoSource(input: string): VideoSource | null {
  if (!input) return null;

  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId && /^[\w-]{11}$/.test(videoId)
        ? {
            kind: 'embed',
            src: `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`,
            poster: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          }
        : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const pathMatch = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
      const videoId = url.searchParams.get('v') ?? pathMatch?.[1];
      return videoId && /^[\w-]{11}$/.test(videoId)
        ? {
            kind: 'embed',
            src: `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`,
            poster: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          }
        : null;
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const videoId = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
      return videoId
        ? { kind: 'embed', src: `https://player.vimeo.com/video/${videoId}` }
        : null;
    }

    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
      return { kind: 'file', src: url.toString() };
    }
    return { kind: 'unsupported', src: url.toString() };
  } catch {
    return null;
  }
}

function getReviewInitials(author: string): string {
  return author
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function ReviewCard({
  review,
  active,
}: {
  review: CraftReview;
  active: boolean;
}) {
  return (
    <blockquote
      aria-hidden={!active}
      className={`flex h-full flex-col justify-between rounded-2xl border bg-[#FCF9F5] p-5 shadow-sm transition-all duration-500 sm:p-7 ${
        active
          ? 'relative z-10 border-[#D7C9B4] shadow-xl'
          : 'scale-[0.94] border-[#E2D7C6] opacity-45 blur-[1.5px]'
      }`}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Quote
            aria-hidden="true"
            className="h-7 w-7 fill-[#073D63]/10 text-[#073D63]/35"
          />
          <div className="flex gap-0.5 text-[#F2AB15]" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
          </div>
        </div>
        <p className="text-base leading-7 text-[#2B2018] sm:text-lg">
          “{review.quote}”
        </p>
        <p className="mt-5 border-t border-[#EFE8DD] pt-4 text-xs leading-relaxed text-[#867363]">
          Sản phẩm: {review.productPurchased}
        </p>
      </div>
      <footer className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8EFF3] text-sm font-semibold text-[#073D63]">
          {getReviewInitials(review.author)}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#2B2018]">
            {review.author}
          </span>
          <span className="mt-0.5 block text-xs text-[#867363]">
            {review.role} · {review.location}
          </span>
        </span>
      </footer>
    </blockquote>
  );
}

export function CraftsmanshipSection() {
  const [activeReview, setActiveReview] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoActivated, setVideoActivated] = useState(false);
  const videoSource = getVideoSource(CRAFT_VIDEO_URL);
  const reviewCount = CRAFT_REVIEWS.length;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (
      !SITE_CONFIG.showCustomerReviews ||
      carouselPaused ||
      reducedMotion ||
      reviewCount < 2
    ) return;
    const timeoutId = window.setTimeout(
      () => setActiveReview((index) => (index + 1) % reviewCount),
      5500
    );
    return () => window.clearTimeout(timeoutId);
  }, [activeReview, carouselPaused, reducedMotion, reviewCount]);

  const moveReview = (step: number) => {
    setActiveReview((index) => (index + step + reviewCount) % reviewCount);
  };

  const previousReview =
    CRAFT_REVIEWS[(activeReview - 1 + reviewCount) % reviewCount];
  const currentReview = CRAFT_REVIEWS[activeReview];
  const nextReview = CRAFT_REVIEWS[(activeReview + 1) % reviewCount];

  return (
    <section
      id="lang-nghe"
      className="border-t border-[#E2D7C6] bg-white/30 py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#E2D7C6] bg-[#E7DDD0] shadow-sm">
              {videoSource?.kind === 'embed' ? (
                videoActivated ? (
                  <iframe
                    src={`${videoSource.src}${videoSource.src.includes('?') ? '&' : '?'}autoplay=1`}
                    title="Video giới thiệu công cụ kỹ thuật và bộ kit DIY VSI"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <>
                    <ResilientImage
                      src={videoSource.poster ?? WORKSHOP_IMAGE}
                      alt="Ảnh xem trước video giới thiệu VSI"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setVideoActivated(true)}
                      aria-label="Phát video giới thiệu VSI"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-[#142A36]/30 px-6 text-center text-white transition-colors hover:bg-[#142A36]/45 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-white/20 shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
                        <Play className="ml-1 h-7 w-7 fill-current" />
                      </span>
                      <span className="mt-4 text-sm font-semibold drop-shadow sm:text-base">
                        Phát video giới thiệu VSI
                      </span>
                    </button>
                  </>
                )
              ) : videoSource?.kind === 'file' ? (
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster={WORKSHOP_IMAGE}
                >
                  <source src={videoSource.src} />
                  Trình duyệt của bạn không hỗ trợ phát video.
                </video>
              ) : (
                <>
                  <ResilientImage
                    src={WORKSHOP_IMAGE}
                    alt="Hình ảnh minh họa cho các dự án DIY tại nhà"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#142A36]/55 px-6 text-center text-white">
                    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40">
                      <Play className="ml-1 h-6 w-6 fill-current" />
                    </span>
                    <p className="text-sm font-semibold">
                      {CRAFT_VIDEO_URL
                        ? 'Liên kết này chưa hỗ trợ phát nhúng'
                        : 'Thêm link video để phát trực tiếp tại đây'}
                    </p>
                    <p className="mt-1 text-xs text-white/80">
                      Hỗ trợ YouTube, Vimeo hoặc link MP4, WebM, OGG
                    </p>
                    {videoSource?.kind === 'unsupported' && (
                      <a
                        href={videoSource.src}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs underline underline-offset-4"
                      >
                        Mở liên kết video <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6 lg:col-span-6">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wider text-[#867363]">
                Công cụ kỹ thuật · Bộ kit DIY · Sáng tạo tại nhà
              </p>
              <h2 className="font-serif text-3xl font-semibold leading-tight text-[#2B2018] md:text-4xl">
                Công cụ phù hợp, ý tưởng sáng tạo thành sản phẩm
              </h2>
              <p className="text-base leading-relaxed text-[#5E4B3C]">
                {SITE_CONFIG.brandName} cung cấp các công cụ kỹ thuật và bộ kit tự làm tại nhà cho
                người thích sáng tạo. Bạn có thể chọn dụng cụ hỗ trợ cho dự án
                của mình hoặc bắt đầu với một bộ kit như tranh gỗ DIY. Video sẽ
                giới thiệu sản phẩm và cách thực hiện để bạn dễ hình dung trước
                khi bắt tay vào làm.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-[#D7C9B4] pt-5 sm:grid-cols-3">
              <div>
                <p className="font-serif text-lg font-semibold text-[#2B2018]">
                  Công cụ kỹ thuật
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5E4B3C]">
                  Dụng cụ hỗ trợ thao tác và hoàn thiện các dự án.
                </p>
              </div>
              <div>
                <p className="font-serif text-lg font-semibold text-[#2B2018]">
                  Bộ kit DIY
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5E4B3C]">
                  Tự tay làm sản phẩm tại nhà theo sở thích của bạn.
                </p>
              </div>
              <div>
                <p className="font-serif text-lg font-semibold text-[#2B2018]">
                  Tranh gỗ DIY
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5E4B3C]">
                  Một ý tưởng sáng tạo để bắt đầu cùng bộ kit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {SITE_CONFIG.showCustomerReviews && (
        <div className="mt-14 border-t border-[#D7C9B4] pt-12">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#867363]">
              
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-[#073D63] md:text-3xl">
              Cảm nhận từ khách hàng
            </h3>
            <p className="mt-2 text-sm text-[#5E4B3C]">
              Chia sẻ về bộ kit DIY, công cụ kỹ thuật và trải nghiệm làm sản phẩm tại nhà.
            </p>
          </div>

          {currentReview && (
            <div
              className="relative mx-auto max-w-[1120px] px-9 sm:px-12"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
              onFocusCapture={() => setCarouselPaused(true)}
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget;
                if (
                  !(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)
                ) {
                  setCarouselPaused(false);
                }
              }}
            >
              <div className="grid items-center gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.2fr)_minmax(0,0.85fr)] md:gap-5">
                {reviewCount > 1 && (
                  <div className="hidden md:block">
                    <ReviewCard review={previousReview} active={false} />
                  </div>
                )}
                <ReviewCard review={currentReview} active />
                {reviewCount > 1 && (
                  <div className="hidden md:block">
                    <ReviewCard review={nextReview} active={false} />
                  </div>
                )}
              </div>

              {reviewCount > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveReview(-1)}
                    aria-label="Xem cảm nhận trước"
                    className="absolute left-0 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#D7C9B4] bg-[#FCF9F5] text-[#073D63] shadow-sm transition hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveReview(1)}
                    aria-label="Xem cảm nhận tiếp theo"
                    className="absolute right-0 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#D7C9B4] bg-[#FCF9F5] text-[#073D63] shadow-sm transition hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="mt-6 flex justify-center gap-2">
                    {CRAFT_REVIEWS.map((review, index) => (
                      <button
                        key={review.id}
                        type="button"
                        onClick={() => setActiveReview(index)}
                        aria-label={`Xem cảm nhận ${index + 1}`}
                        aria-current={index === activeReview ? 'true' : undefined}
                        className={`h-2.5 rounded-full transition-all ${
                          index === activeReview
                            ? 'w-7 bg-[#F2AB15]'
                            : 'w-2.5 bg-[#C8D2D8] hover:bg-[#073D63]/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
}
