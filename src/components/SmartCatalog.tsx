import { MouseEvent, RefObject, useId, useMemo, useRef, useState } from 'react';
import {
  Check,
  Search,
  SlidersHorizontal,
  Star,
  X,
  ArrowUpDown,
} from 'lucide-react';
import {
  QUICK_SEARCH_TERMS,
} from '../data/products';
import { SITE_CONFIG } from '../config/site';
import {
  CraftCategory,
  FilterState,
  Product,
  SortOption,
} from '../types/shop';
import { formatVND, scoreProductSearch } from '../utils/format';
import { ResilientImage } from './ResilientImage';

interface SmartCatalogProps {
  products: Product[];
  productsLoading: boolean;
  productsLoadError: string | null;
  filters: FilterState;
  onRetryProducts: () => void;
  onUpdateFilters: (patch: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, variantId: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function SmartCatalog({
  products,
  productsLoading,
  productsLoadError,
  filters,
  onRetryProducts,
  onUpdateFilters,
  onResetFilters,
  onSelectProduct,
  onQuickAdd,
  searchInputRef,
}: SmartCatalogProps) {
  const fieldId = useId().replace(/:/g, '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const dropdownBlurTimer = useRef<number | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tất Cả': products.length };
    for (const product of products) {
      counts[product.category] = (counts[product.category] || 0) + 1;
    }
    return counts;
  }, [products]);

  const searchSuggestions = useMemo(() => {
    if (!filters.query.trim()) return [];
    return products
      .map((product) => ({
        product,
        score: scoreProductSearch(product, filters.query),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => entry.product);
  }, [filters.query, products]);

  const filteredProducts = useMemo(() => {
    const scored = products
      .map((product) => ({
        product,
        score: scoreProductSearch(product, filters.query),
      }))
      .filter(({ product, score }) => {
        if (filters.query.trim() && score === 0) return false;
        if (
          filters.category !== 'Tất Cả' &&
          product.category !== filters.category
        ) {
          return false;
        }
        if (
          filters.village !== 'Tất cả ' &&
          product.village !== filters.village
        ) {
          return false;
        }
        if (
          filters.material !== 'Tất cả chất liệu' &&
          product.material !== filters.material
        ) {
          return false;
        }
        if (filters.priceRange === 'under-500' && product.price >= 500000) {
          return false;
        }
        if (
          filters.priceRange === '500-1500' &&
          (product.price < 500000 || product.price > 1500000)
        ) {
          return false;
        }
        if (filters.priceRange === 'over-1500' && product.price <= 1500000) {
          return false;
        }
        if (product.price > filters.maxPrice) {
          return false;
        }
        if (filters.inStockOnly && !product.inStock) {
          return false;
        }
        return true;
      });

    scored.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return a.product.price - b.product.price;
        case 'price-desc':
          return b.product.price - a.product.price;
        case 'rating-desc':
          return (
            b.product.rating - a.product.rating ||
            b.product.reviewCount - a.product.reviewCount
          );
        case 'newest':
          return (
            Number(Boolean(b.product.isNew)) - Number(Boolean(a.product.isNew))
          );
        case 'featured':
        default:
          if (filters.query.trim() && b.score !== a.score) {
            return b.score - a.score;
          }
          return a.product.featuredRank - b.product.featuredRank;
      }
    });

    return scored.map((entry) => entry.product);
  }, [filters, products]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query.trim()) count += 1;
    if (filters.category !== 'Tất Cả') count += 1;
    if (filters.village !== 'Tất cả ') count += 1;
    if (filters.material !== 'Tất cả chất liệu') count += 1;
    if (filters.priceRange !== 'all') count += 1;
    if (filters.maxPrice < 2500000) count += 1;
    if (filters.inStockOnly) count += 1;
    return count;
  }, [filters]);

  const handleQuickAddClick = (
    e: MouseEvent<HTMLButtonElement>,
    product: Product
  ) => {
    e.stopPropagation();
    const defaultVariant = product.variants[0];
    onQuickAdd(product, defaultVariant.id);
    setAddedId(product.id);
    window.setTimeout(() => {
      setAddedId((current) => (current === product.id ? null : current));
    }, 1200);
  };

  return (
    <section id="san-pham" className="py-14 md:py-20 bg-white/25">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wider text-[#867363]">
              Bộ sưu tập thủ công · Tìm kiếm &amp; Lọc thông minh
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#2B2018]">
              Sản Phẩm Tuyển Chọn
            </h2>
          </div>
          <p className="text-sm text-[#5E4B3C] tabular-nums">
            {productsLoading
              ? 'Đang tải sản phẩm...'
              : productsLoadError
                ? 'Không tải được sản phẩm'
                : `Hiển thị ${filteredProducts.length} / ${products.length} sản phẩm`}
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-[#E2D7C6] bg-[#FCF9F5] p-4">
              <label className="mb-2 block text-sm font-semibold text-[#2B2018]" htmlFor={`${fieldId}-catalog-search`}>
                Tìm kiếm sản phẩm
              </label>
              <div className="relative">
              <Search
                className="w-4 h-4 text-[#867363] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                id={`${fieldId}-catalog-search`}
                name="q"
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                value={filters.query}
                onChange={(e) => onUpdateFilters({ query: e.target.value })}
                onFocus={() => {
                  if (dropdownBlurTimer.current) {
                    window.clearTimeout(dropdownBlurTimer.current);
                  }
                  setSearchFocused(true);
                }}
                onBlur={() => {
                  dropdownBlurTimer.current = window.setTimeout(() => {
                    setSearchFocused(false);
                  }, 180);
                }}
                placeholder={SITE_CONFIG.searchPlaceholder || undefined}
                aria-label="Tìm kiếm sản phẩm"
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] py-2.5 pl-10 pr-10 text-sm text-[#2B2018] placeholder:text-[#867363] transition-colors focus:border-[#073D63] focus:outline-none"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ query: '' })}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#867363] hover:text-[#2B2018] cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {searchFocused && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl shadow-lg p-4">
                  {filters.query.trim() ? (
                    searchSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[#867363]">
                          Gợi ý phù hợp nhất
                        </p>
                        <div className="max-h-72 divide-y divide-[#EFE8DD] overflow-y-auto">
                          {searchSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSearchFocused(false);
                                onSelectProduct(item);
                              }}
                              className="w-full py-2.5 flex items-center justify-between gap-4 text-left hover:bg-[#F8F4EE] px-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-md overflow-hidden bg-[#EFE8DD] shrink-0 border border-[#E2D7C6]">
                                  <ResilientImage
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-contain p-1"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#2B2018] truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-[#867363] truncate">
                                    {item.category} · {item.village} · {item.material}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-[#073D63] tabular-nums shrink-0">
                                {formatVND(item.price)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#5E4B3C]">
                        Không tìm thấy gợi ý phù hợp với “{filters.query}”.
                      </p>
                    )
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs font-medium text-[#867363]">
                        Từ khóa phổ biến
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_SEARCH_TERMS.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onUpdateFilters({ query: term });
                              setSearchFocused(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#F8F4EE] hover:bg-[#EFE8DD] border border-[#E2D7C6] text-xs font-medium text-[#2B2018] transition-colors cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>

            <div className="rounded-xl border border-[#E2D7C6] bg-[#FCF9F5] p-4">
              <label className="mb-2 block text-sm font-semibold text-[#2B2018]" htmlFor={`${fieldId}-catalog-sort`}>
                Sắp xếp
              </label>
              <div className="relative">
                <ArrowUpDown className="w-4 h-4 text-[#867363] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id={`${fieldId}-catalog-sort`}
                  name="sort"
                  value={filters.sortBy}
                  onChange={(e) =>
                    onUpdateFilters({ sortBy: e.target.value as SortOption })
                  }
                  aria-label="Sắp xếp sản phẩm"
                  className="w-full appearance-none rounded-lg border border-[#E2D7C6] bg-[#F8F4EE] py-2.5 pl-9 pr-8 text-sm text-[#2B2018] focus:border-[#073D63] focus:outline-none cursor-pointer"
                >
                  <option value="featured">Sắp xếp: Phù hợp nhất</option>
                  <option value="price-asc">Giá: Thấp đến cao</option>
                  <option value="price-desc">Giá: Cao đến thấp</option>
                  <option value="rating-desc">Đánh giá cao nhất</option>
                  <option value="newest">Mới ra mắt</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E2D7C6] bg-[#FCF9F5]">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                aria-expanded={showAdvanced}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#2B2018] transition-colors hover:bg-[#F8F4EE] cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#073D63]" />
                  Bộ lọc nâng cao
                </span>
                <span className="text-xs font-medium text-[#867363]">
                  {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </span>
              </button>
              {showAdvanced && (
                <div className="space-y-4 border-t border-[#EFE8DD] p-4">
                  {(['Công cụ máy móc', 'Bộ kit'] as CraftCategory[]).map((category, index) => (
                    <label
                      htmlFor={`${fieldId}-category-${index}`}
                      key={category}
                      className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[#5E4B3C]"
                    >
                      <span>{category}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-[#867363] tabular-nums">
                          {categoryCounts[category] || 0}
                        </span>
                        <input
                          id={`${fieldId}-category-${index}`}
                          name="category"
                          type="checkbox"
                          checked={filters.category === category}
                          onChange={(event) =>
                            onUpdateFilters({
                              category: event.target.checked ? category : 'Tất Cả',
                            })
                          }
                          className="h-4 w-4 accent-[#073D63]"
                        />
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="w-full rounded-lg border border-[#E2D7C6] bg-[#FCF9F5] px-4 py-2.5 text-sm font-medium text-[#073D63] transition-colors hover:bg-[#EFE8DD] cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </aside>

          <div className="min-w-0">
            {productsLoading ? (
              <div
                className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-[#E2D7C6] bg-[#FCF9F5] p-8 text-center"
                role="status"
              >
                <span className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#D7C9B4] border-t-[#073D63]" />
                <p className="text-sm text-[#5E4B3C]">
                  Đang tải sản phẩm từ Firebase...
                </p>
              </div>
            ) : productsLoadError ? (
              <div
                className="space-y-4 rounded-xl border border-[#E2D7C6] bg-[#FCF9F5] p-8 text-center"
                role="alert"
              >
                <p className="font-serif text-xl font-semibold text-[#2B2018]">
                  Không thể tải sản phẩm
                </p>
                <p className="text-sm text-[#5E4B3C]">{productsLoadError}</p>
                <button
                  type="button"
                  onClick={onRetryProducts}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#073D63] px-5 py-2.5 text-sm font-medium text-[#FCF9F5] transition-colors hover:bg-[#5E3A1F]"
                >
                  Thử tải lại
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-[#E2D7C6] bg-[#FCF9F5] p-12 text-center">
                <p className="font-serif text-2xl font-semibold text-[#2B2018]">
                  Chưa có sản phẩm nào
                </p>
                <p className="mx-auto max-w-md text-sm text-[#5E4B3C]">
                  Sản phẩm sẽ hiển thị tại đây sau khi được thêm vào cửa hàng trên Firebase.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
          <div className="bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl p-12 text-center space-y-4">
            <p className="font-serif text-2xl font-semibold text-[#2B2018]">
              Không tìm thấy sản phẩm phù hợp
            </p>
            <p className="text-sm text-[#5E4B3C] max-w-md mx-auto">
              Hãy thử mở rộng khoảng giá, đổi chất liệu hoặc xóa bớt tiêu chí lọc để khám phá toàn bộ bộ sưu tập thủ công mỹ nghệ.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5] text-sm font-medium transition-colors cursor-pointer"
            >
              Xóa bộ lọc &amp; xem tất cả
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const isJustAdded = addedId === product.id;
              return (
                <article
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group bg-[#FCF9F5] border border-[#E2D7C6] rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* 4:3 Uniform HD Imagery */}
                    <div className="aspect-[4/3] w-full bg-[#EFE8DD] overflow-hidden border-b border-[#EFE8DD] relative">
                      <ResilientImage
                        src={product.image}
                        alt={product.name}
                        fallbackTitle={product.name}
                        className="w-full h-full object-contain object-center p-2 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </div>

                    {/* Clean Unboxed Metadata */}
                    <div className="p-6 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#867363]">
                        <span className="truncate">
                          {product.category} · {product.village} · {product.material}
                        </span>
                        <span className="shrink-0 font-medium text-[#5E4B3C]">
                          {product.availabilityTag}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#867363] tabular-nums">
                        Mã SKU: {product.sku}
                      </p>

                      <h3 className="font-serif text-xl font-semibold text-[#2B2018] leading-snug group-hover:text-[#073D63] transition-colors">
                        {product.name}
                      </h3>

                      <p className="text-sm text-[#5E4B3C] leading-relaxed line-clamp-2">
                        {product.shortDesc}
                      </p>

                      {/* Variant Swatches + Rating */}
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          {product.variants.map((variant) => (
                            <span
                              key={variant.id}
                              title={variant.label}
                              className="w-3.5 h-3.5 rounded-full border border-[#D7C9B4]"
                              style={{ backgroundColor: variant.colorHex }}
                            />
                          ))}
                          <span className="text-xs text-[#867363] ml-1">
                            {product.variants.length} phiên bản
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1 text-xs text-[#5E4B3C] tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-[#073D63] text-[#073D63]" />
                          <span className="font-medium text-[#2B2018]">
                            {product.rating.toFixed(1)}
                          </span>
                          <span className="text-[#867363]">
                            ({product.reviewCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aligned Price & Direct Cart Action Footer */}
                  <div className="px-6 py-4 border-t border-[#EFE8DD] flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] text-[#867363]">Giá niêm yết</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-base font-bold text-[#2B2018] tabular-nums">
                          {formatVND(product.price)}
                        </p>
                        {product.originalPrice &&
                          product.originalPrice > product.price && (
                            <p className="text-xs text-[#867363] line-through tabular-nums">
                              {formatVND(product.originalPrice)}
                            </p>
                          )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAddClick(e, product)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isJustAdded
                          ? 'bg-[#3F5E3B] text-[#FCF9F5]'
                          : 'bg-[#073D63] hover:bg-[#5E3A1F] text-[#FCF9F5]'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã thêm</span>
                        </>
                      ) : (
                        <span>Thêm vào giỏ</span>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
          </div>
        </div>
      </div>
    </section>
  );
}