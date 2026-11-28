// Installment ("Muddatli to'lov") pricing. Each product can carry a markup percentage per
// installment length, e.g. {"3": 30, "6": 45}: with 3 months the unit price is raised by 30%, and the
// customer pays that total in equal monthly parts. No imports here, so the browser and the server use
// the same arithmetic.

export const INSTALLMENT_MONTHS = [3, 6, 12] as const;
export type InstallmentMonths = (typeof INSTALLMENT_MONTHS)[number];
export type InstallmentMarkups = Partial<Record<InstallmentMonths, number>>;

const MAX_MARKUP_PERCENT = 1000;

/** Markup percentages from a stored/posted value. Anything that isn't a positive number is dropped. */
export function parseInstallmentMarkups(value: unknown): InstallmentMarkups {
  const result: InstallmentMarkups = {};
  if (!value || typeof value !== "object") return result;
  for (const months of INSTALLMENT_MONTHS) {
    const raw = (value as Record<string, unknown>)[String(months)];
    const pct = typeof raw === "string" ? Number(raw) : raw;
    if (typeof pct === "number" && Number.isFinite(pct) && pct > 0) {
      result[months] = Math.min(MAX_MARKUP_PERCENT, Math.round(pct * 100) / 100);
    }
  }
  return result;
}

/** What gets stored: only the set markups, or null when there are none. */
export function installmentMarkupsForStorage(value: unknown): InstallmentMarkups | null {
  const parsed = parseInstallmentMarkups(value);
  return Object.keys(parsed).length ? parsed : null;
}

export function installmentMarkupPercent(value: unknown, months: number): number {
  return parseInstallmentMarkups(value)[months as InstallmentMonths] ?? 0;
}

/** Unit price for an installment of `months`: the price raised by that product's markup. */
export function installmentUnitPrice(price: number, markups: unknown, months: number): number {
  return Math.round(price * (1 + installmentMarkupPercent(markups, months) / 100));
}

/** Monthly part of an installment total (rounded up so the parts always cover the total). */
export function installmentMonthlyPayment(total: number, months: number): number {
  return Math.ceil(total / months);
}

/**
 * Order lines re-priced for an installment. `markupsByProductId` comes from the database, so a
 * client can't choose its own markup; lines for unknown products keep their price.
 */
export function applyInstallmentMarkup<T extends { productId: string; price: number }>(
  items: T[],
  markupsByProductId: Map<string, unknown>,
  months: number
): T[] {
  return items.map((item) => ({
    ...item,
    price: installmentUnitPrice(item.price, markupsByProductId.get(item.productId), months),
  }));
}
