import { useState } from 'react';
import { MessageCircle, Phone, X } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';

const PHONE_DISPLAY = '094 816 07 16';
const PHONE_RAW = '0948160716';
const ZALO_URL = 'https://zalo.me/0948160716';
const FACEBOOK_URL = 'https://www.facebook.com/share/1Eog8LStK7/?mibextid=wwXIfr';

export function FloatingWidgets() {
  const [mobileContactOpen, setMobileContactOpen] = useState(false);

  return (
    <>
      {/* Desktop Right-Edge Contact Rail (Sits cleanly in the right gutter without covering product cards) */}
      <aside
        aria-label="Kênh liên hệ nhanh"
        className="hidden md:flex fixed right-3 top-1/2 -translate-y-1/2 z-30 flex-col gap-2"
      >
        {/* Zalo */}
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chat Zalo ${PHONE_DISPLAY}`}
          title={`Zalo: ${PHONE_DISPLAY}`}
          className="group relative w-10 h-10 rounded-xl bg-[#FCF9F5]/95 backdrop-blur-xs border border-[#E2D7C6] hover:border-[#073D63] text-[#073D63] shadow-sm flex items-center justify-center transition-colors"
        >
          <span className="text-[11px] font-bold tracking-tight">Zalo</span>
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-full mr-2.5 px-2.5 py-1 rounded-md bg-[#2B2018] text-[#FCF9F5] text-xs font-medium whitespace-nowrap tabular-nums shadow-sm">
            Zalo: {PHONE_DISPLAY}
          </span>
        </a>

        {/* Facebook */}
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Facebook ${SITE_CONFIG.brandName}`}
          title={`Facebook ${SITE_CONFIG.brandName}`}
          className="group relative w-10 h-10 rounded-xl bg-[#FCF9F5]/95 backdrop-blur-xs border border-[#E2D7C6] hover:border-[#073D63] text-[#073D63] shadow-sm flex items-center justify-center transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 fill-current"
            aria-hidden="true"
          >
            <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H7.7v3h2.6v8h3.2z" />
          </svg>
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-full mr-2.5 px-2.5 py-1 rounded-md bg-[#2B2018] text-[#FCF9F5] text-xs font-medium whitespace-nowrap shadow-sm">
            Facebook {SITE_CONFIG.brandName}
          </span>
        </a>

        {/* Phone */}
        <a
          href={`tel:${PHONE_RAW}`}
          aria-label={`Gọi điện ${PHONE_DISPLAY}`}
          title={`Gọi ngay: ${PHONE_DISPLAY}`}
          className="group relative w-10 h-10 rounded-xl bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] shadow-sm flex items-center justify-center transition-colors"
        >
          <Phone className="w-4 h-4" strokeWidth={1.8} />
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-full mr-2.5 px-2.5 py-1 rounded-md bg-[#2B2018] text-[#FCF9F5] text-xs font-medium whitespace-nowrap tabular-nums shadow-sm">
            Gọi {PHONE_DISPLAY}
          </span>
        </a>
      </aside>

      {/* Mobile Compact Contact Trigger (Bottom-Right, expands only on tap) */}
      <div className="md:hidden fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
        {mobileContactOpen && (
          <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-2 shadow-lg flex flex-col gap-1.5">
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg hover:bg-[#EFE8DD] text-xs font-semibold text-[#2B2018] flex items-center gap-2 whitespace-nowrap tabular-nums"
            >
              <span className="text-[#073D63] font-bold">Zalo</span>
              <span>{PHONE_DISPLAY}</span>
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg hover:bg-[#EFE8DD] text-xs font-semibold text-[#2B2018] flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-[#073D63] font-bold">FB</span>
              <span>Facebook</span>
            </a>
            <a
              href={`tel:${PHONE_RAW}`}
              className="px-3 py-2 rounded-lg hover:bg-[#EFE8DD] text-xs font-semibold text-[#2B2018] flex items-center gap-2 whitespace-nowrap tabular-nums"
            >
              <Phone className="w-3.5 h-3.5 text-[#073D63]" />
              <span>{PHONE_DISPLAY}</span>
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMobileContactOpen((prev) => !prev)}
          aria-label={mobileContactOpen ? 'Đóng liên hệ' : 'Mở kênh liên hệ Zalo, Facebook, SĐT'}
          className="w-11 h-11 rounded-full bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] shadow-md flex items-center justify-center cursor-pointer"
        >
          {mobileContactOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <MessageCircle className="w-5 h-5" />
          )}
        </button>
      </div>
    </>
  );
}
