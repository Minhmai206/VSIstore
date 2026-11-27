import { CraftCategory } from '../types/shop';
import { SITE_CONFIG } from '../config/site';
import vsiLogo from '../assets/images/vsi-logo-navy.png';

interface FooterProps {
  categories: Exclude<CraftCategory, 'Tất Cả'>[];
  onSelectCategory: (category: CraftCategory) => void;
  onOpenOrders: () => void;
}

export function Footer({
  categories,
  onSelectCategory,
  onOpenOrders,
}: FooterProps) {
  return (
    <footer className="border-t border-[#1F5B7A] bg-[#063E5F] text-[#EFE8DD]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-3">
           
<div style={{ width: "100%", maxWidth: "450px" }}>
  <iframe
    title={`Bản đồ vị trí công ty ${SITE_CONFIG.brandName}`}
    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d240.39815667002142!2d105.83740548397293!3d21.026052457776693!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1svi!2s!4v1795252402586!5m2!1svi!2s"
    width="100%"
    height="220"
    style={{
      border: 0,
      borderRadius: "12px",
      display: "block"
    }}
    allowFullScreen
    loading="lazy"
    referrerPolicy="strict-origin-when-cross-origin"
  />
</div>

          </div>

          <div className="md:col-span-3 space-y-3">
            <a
              href="#top"
              aria-label={`${SITE_CONFIG.brandName} - về đầu trang`}
              className="inline-flex h-[76px] w-[210px] max-w-full items-center justify-center overflow-hidden bg-[#063E5F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2AB15]"
            >
              <img
                src={vsiLogo}
                alt={SITE_CONFIG.brandName}
                className="h-full w-full object-cover"
              />
            </a>

            <ul className="space-y-2 text-sm text-[#D7C9B4]">
              {categories.map((cat) => (
                <li key={cat}>
                  <a
                    href="#san-pham"
                    onClick={() => onSelectCategory(cat)}
                    className="hover:text-[#FCF9F5] transition-colors"
                  >
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <p className="text-sm font-semibold text-[#FCF9F5]">
              Xưởng trưng bày &amp; Liên hệ
            </p>
            <div className="space-y-2 text-sm text-[#D7C9B4]">
              <p>07 Quốc Tử Giám, Văn Miếu - Quốc Tử Giám, Hà Nội, Vietnam</p>
          
              <p className="tabular-nums">
                Điện thoại / Zalo:{' '}
                <a
                  href="tel:0948 160 716"
                  className="text-[#FCF9F5] underline underline-offset-4 hover:text-[#E2D7C6]"
                >
                  0948 160 716
                </a>
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="https://zalo.me/0948160716"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#FCF9F5] underline underline-offset-4 hover:text-[#E2D7C6]"
                >
                  Zalo
                </a>
                <a
                  href="https://www.facebook.com/share/1Eog8LStK7/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#FCF9F5] underline underline-offset-4 hover:text-[#E2D7C6]"
                >
                  Facebook
                </a>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="text-sm font-medium text-[#FCF9F5] underline underline-offset-4 hover:text-[#E2D7C6] cursor-pointer"
                >
                  Tra cứu đơn hàng
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#1F5B7A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#C8D6DE]">
          <p>
            © {SITE_CONFIG.footer.copyrightYear} {SITE_CONFIG.brandName}.{' '}
            {SITE_CONFIG.footer.copyrightLabel}
          </p>
          <p>{SITE_CONFIG.footer.paymentNote}</p>
        </div>
      </div>
    </footer>
  );
}
