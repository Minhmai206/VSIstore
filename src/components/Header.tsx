import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { Product } from '../types/shop';
import { formatVND, scoreProductSearch } from '../utils/format';
import vsiLogo from '../assets/images/vsi-logo-navy.png';
import { ResilientImage } from './ResilientImage';

interface HeaderProps {
  cartCount: number;
  searchQuery: string;
  products: Product[];
  onSearchChange: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onSearchSubmit: () => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onOpenOrders: () => void;
}

export function Header({
  cartCount,
  searchQuery,
  products,
  onSearchChange,
  onSelectProduct,
  onSearchSubmit,
  onOpenCart,
  onOpenAccount,
  onOpenOrders,
}: HeaderProps) {
  const searchId = useId().replace(/:/g, '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const quickResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products
      .map((product) => ({
        product,
        score: scoreProductSearch(product, searchQuery),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => entry.product);
  }, [products, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFocused(false);
    onSearchSubmit();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1F5B7A] bg-[#063E5F]/95 text-[#FCF9F5] backdrop-blur-sm">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-4 md:gap-8">
        <a
          href="#top"
          aria-label="VSI Education - về đầu trang"
          className="inline-flex h-[52px] w-[100px] shrink-0 items-center justify-center overflow-hidden bg-[#063E5F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2AB15] sm:w-[150px]"
        >
          <img
            src={vsiLogo}
            alt="VSI Education"
            className="h-full w-full object-cover"
          />
        </a>

        {/* Zone 2: Nav Links + Live Search Input */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center min-w-0">
          <nav
            aria-label="Điều hướng chính"
            className="flex items-center gap-6 text-sm font-medium text-[#EAF1F5] shrink-0"
          >
            <a
              href="#san-pham"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Bộ Sưu Tập
            </a>
            <a
              href="#lang-nghe"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Giới Thiệu 
            </a>
            <button
              type="button"
              onClick={onOpenOrders}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Đơn Hàng
            </button>
          </nav>

          {/* Direct Live Search Box in Header */}
          <form onSubmit={handleSubmit} className="relative w-full max-w-xs">
            <label htmlFor={`${searchId}-desktop`} className="sr-only">
              Tìm kiếm nhanh sản phẩm
            </label>
            <Search
              className="w-4 h-4 text-[#867363] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              id={`${searchId}-desktop`}
              name="q"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => {
                if (blurTimer.current) window.clearTimeout(blurTimer.current);
                setSearchFocused(true);
              }}
              onBlur={() => {
                blurTimer.current = window.setTimeout(() => {
                  setSearchFocused(false);
                }, 180);
              }}
              placeholder="Tìm gốm, mây tre, gỗ..."
              aria-label="Tìm kiếm nhanh sản phẩm"
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#FCF9F5] border border-[#E2D7C6] text-sm text-[#2B2018] placeholder:text-[#867363] focus:outline-none focus:border-[#073D63] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Xóa từ khóa"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#867363] hover:text-[#2B2018] p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {searchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl shadow-lg p-2 space-y-1">
                {quickResults.length > 0 ? (
                  <>
                    {quickResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchFocused(false);
                          onSelectProduct(item);
                        }}
                        className="w-full p-2 flex items-center justify-between gap-2.5 text-left rounded-lg hover:bg-[#F8F4EE] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ResilientImage
                            src={item.image}
                            alt={item.name}
                            className="w-9 h-9 rounded-md object-contain p-0.5 border border-[#E2D7C6] shrink-0 bg-[#EFE8DD]"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#2B2018] truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-[#867363] truncate">
                              {item.village}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#073D63] tabular-nums shrink-0">
                          {formatVND(item.price)}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchFocused(false);
                        onSearchSubmit();
                      }}
                      className="w-full py-1.5 text-center text-xs font-medium text-[#073D63] hover:underline border-t border-[#EFE8DD] cursor-pointer"
                    >
                      Xem tất cả kết quả trong bộ sưu tập
                    </button>
                  </>
                ) : (
                  <p className="p-2 text-xs text-[#5E4B3C]">
                    Không tìm thấy sản phẩm khớp “{searchQuery}”.
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-1.5 shrink-0 sm:gap-3">
          <button
            type="button"
            onClick={onOpenAccount}
            aria-label="Đăng nhập hoặc mở tài khoản"
            title="Tài khoản"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/35 text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            <UserRound className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/35 text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#F2AB15] hover:bg-[#FFC43D] text-[#073D63] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-sm"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
            <span className="tabular-nums">Giỏ Hàng ({cartCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation & search drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1F5B7A] bg-[#063E5F] px-6 py-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onSearchSubmit();
            }}
            className="relative"
          >
            <label htmlFor={`${searchId}-mobile`} className="sr-only">
              Tìm kiếm sản phẩm
            </label>
            <Search className="w-4 h-4 text-[#867363] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id={`${searchId}-mobile`}
              name="q"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm sản phẩm thủ công..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F8F4EE] border border-[#E2D7C6] text-sm text-[#2B2018] focus:outline-none focus:border-[#073D63]"
            />
          </form>

          <nav
            aria-label="Điều hướng di động"
            className="flex flex-col gap-2 text-sm font-medium text-[#EAF1F5]"
          >
            <a
              href="#san-pham"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-white"
            >
              Bộ Sưu Tập
            </a>
            <a
              href="#lang-nghe"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-white"
            >
               
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenOrders();
              }}
              className="py-2 text-left hover:text-[#2B2018]"
            >
              Tra Cứu Đơn Hàng
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccount();
              }}
              className="py-2 text-left hover:text-[#2B2018]"
            >
              Tài khoản
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
