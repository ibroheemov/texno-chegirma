// The price a customer actually pays for a product: the sale price while the product is on sale,
// otherwise the regular price. Same rule as the Kassa (PosView), the sales API and the Telegram bot.

type Priced = { price: number; onSale: boolean; salePrice: number | null };

export function effectivePrice(p: Priced): number {
  return p.onSale && p.salePrice ? p.salePrice : p.price;
}

/** Whole-number discount percentage, or null when the product isn't actually discounted. */
export function discountPercent(p: Priced): number | null {
  if (!p.onSale || !p.salePrice || p.price <= 0 || p.salePrice >= p.price) return null;
  return Math.round(((p.price - p.salePrice) / p.price) * 100);
}
