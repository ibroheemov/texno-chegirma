// Shared (server + client) helpers for New design -> Mijozlar: group/tag colors and loyalty tiers.

export const SEGMENT_COLORS = ["blue", "green", "orange", "violet", "red", "teal", "gray"] as const;
export type SegmentColor = (typeof SEGMENT_COLORS)[number];

export const SEGMENT_COLOR_LABELS: Record<SegmentColor, string> = {
  blue: "Ko‘k",
  green: "Yashil",
  orange: "To‘q sariq",
  violet: "Binafsha",
  red: "Qizil",
  teal: "Feruza",
  gray: "Kulrang",
};

export function normalizeColor(value: unknown): SegmentColor {
  return SEGMENT_COLORS.includes(value as SegmentColor) ? (value as SegmentColor) : "blue";
}

export type LoyaltyTier = {
  id: string;
  name: string;
  /** Minimum total purchases (so'm, canceled sales excluded) to reach this tier. */
  minSpent: number;
  /** Discount the tier entitles the customer to. Informational: not applied at checkout yet. */
  discountPercent: number;
  color: SegmentColor;
};

export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  { id: "bronze", name: "Bronza", minSpent: 0, discountPercent: 0, color: "orange" },
  { id: "silver", name: "Kumush", minSpent: 5_000_000, discountPercent: 2, color: "gray" },
  { id: "gold", name: "Oltin", minSpent: 20_000_000, discountPercent: 4, color: "blue" },
  { id: "platinum", name: "Platina", minSpent: 50_000_000, discountPercent: 6, color: "violet" },
];

/** Validates and sorts tiers coming from JSON (DB or request body). Returns null if invalid. */
export function parseTiers(raw: unknown): LoyaltyTier[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) return null;
  const tiers: LoyaltyTier[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const t = item as Record<string, unknown>;
    const name = typeof t.name === "string" ? t.name.trim() : "";
    const minSpent = Math.round(Number(t.minSpent));
    const discountPercent = Number(t.discountPercent);
    if (!name || !Number.isFinite(minSpent) || minSpent < 0) return null;
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return null;
    tiers.push({
      id: typeof t.id === "string" && t.id ? t.id : `t${tiers.length}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.slice(0, 40),
      minSpent,
      discountPercent: Math.round(discountPercent * 10) / 10,
      color: normalizeColor(t.color),
    });
  }
  tiers.sort((a, b) => a.minSpent - b.minSpent);
  return tiers;
}

/** Highest tier whose threshold the customer reached, or null if below the first tier. */
export function tierFor(tiers: LoyaltyTier[], totalSpent: number): LoyaltyTier | null {
  let match: LoyaltyTier | null = null;
  for (const tier of tiers) if (totalSpent >= tier.minSpent) match = tier;
  return match;
}

/** The next tier above the current one, for "progress to next tier". */
export function nextTier(tiers: LoyaltyTier[], totalSpent: number): LoyaltyTier | null {
  return tiers.find((tier) => tier.minSpent > totalSpent) ?? null;
}
