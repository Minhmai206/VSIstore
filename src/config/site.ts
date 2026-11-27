import type { CraftCategory } from '../types/shop';

export const SITE_CONFIG = {
  brandName: 'VSI',
  legalName: 'CÔNG TY TNHH GIÁO DỤC ĐỔI MỚI SÁNG TẠO STEM VIỆT NAM',
  slogan: '',
  orderNumberPrefix: 'VSI',
  searchPlaceholder: '',
  footerCategories: ['Công cụ máy móc', 'Bộ kit'] satisfies readonly CraftCategory[],
  showCustomerReviews: false,
  metadata: {
    title: 'VSI | Công cụ máy móc và Bộ kit',
    description:
      'Khám phá các sản phẩm công cụ máy móc và bộ kit tại VSI. Xem thông tin chi tiết và lựa chọn sản phẩm phù hợp.',
  },
  hero: {
    heading: 'GIÁO DỤC ĐỔI MỚI SÁNG TẠO STEM VIỆT NAM',
    description:
      'Mỗi sản phẩm đều góp phần đem lại sự sáng tạo khi sử dụng, góp phần đem lại kiến thức về công nghệ và thủ công trong thời đại số.',
    exploreLabel: 'Khám Phá Sản Phẩm',
    aboutLabel: 'Giới thiệu về VSI',
    stats: [
      { value: 'Các Sản Phẩm', label: 'Đảm bảo chất lượng' },
      { value: '100% Nguyên Liệu', label: 'Hoạt động vì môi trường' },
      { value: 'Từ 1,5 triệu', label: 'Miễn phí giao toàn quốc' },
    ],
  },
  announcement: {
    intro: 'Ưu đãi đặt hàng: Nhập mã',
    promoCode: 'MOCDAT10',
    discountLabel: 'giảm 10%',
    shippingLabel: 'Miễn phí vận chuyển toàn quốc cho đơn từ 1.500.000₫',
    actionLabel: 'Xem bộ sưu tập',
  },
  footer: {
    copyrightYear: 2026,
    copyrightLabel: 'Bảo lưu mọi quyền.',
    paymentNote: 'Hỗ trợ chuyển khoản VietQR thủ công và thanh toán khi nhận hàng (COD).',
  },
} as const;
