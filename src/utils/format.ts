import { Product } from '../types/shop';

export function formatVND(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}₫`;
}

export function formatOrderDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export function removeVietnameseDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function scoreProductSearch(product: Product, rawQuery: string): number {
  const query = removeVietnameseDiacritics(rawQuery);
  if (!query) return 1;

  const tokens = query.split(/\s+/).filter(Boolean);
  const nameNorm = removeVietnameseDiacritics(product.name);
  const categoryNorm = removeVietnameseDiacritics(product.category);
  const villageNorm = removeVietnameseDiacritics(product.village);
  const materialNorm = removeVietnameseDiacritics(product.material);
  const descNorm = removeVietnameseDiacritics(product.shortDesc);
  const skuNorm = removeVietnameseDiacritics(product.sku);
  const keywordsNorm = product.keywords.map(removeVietnameseDiacritics).join(' ');

  const combined = `${nameNorm} ${categoryNorm} ${villageNorm} ${materialNorm} ${descNorm} ${skuNorm} ${keywordsNorm}`;

  // Require all search tokens to match somewhere in the searchable corpus
  const allMatch = tokens.every((token) => combined.includes(token));
  if (!allMatch) return 0;

  let score = 10;
  if (nameNorm.includes(query)) score += 60;
  if (nameNorm.startsWith(query)) score += 25;
  if (categoryNorm.includes(query)) score += 20;
  if (villageNorm.includes(query)) score += 20;
  if (materialNorm.includes(query)) score += 15;
  if (keywordsNorm.includes(query)) score += 12;

  for (const token of tokens) {
    if (nameNorm.includes(token)) score += 10;
    if (villageNorm.includes(token) || materialNorm.includes(token)) score += 6;
  }

  return score;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}
