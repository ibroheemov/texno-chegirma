import { prisma } from "@/lib/prisma";
import { DEFAULT_LOYALTY_TIERS, parseTiers, type LoyaltyTier } from "@/lib/customerSegments";

/** Store's loyalty settings; defaults (disabled) until the owner saves them in Sodiqlik dasturi. */
export async function getLoyaltyProgram(storeId: string): Promise<{ enabled: boolean; saved: boolean; tiers: LoyaltyTier[] }> {
  const program = await prisma.loyaltyProgram.findUnique({ where: { storeId } });
  if (!program) return { enabled: false, saved: false, tiers: DEFAULT_LOYALTY_TIERS };
  return { enabled: program.enabled, saved: true, tiers: parseTiers(program.tiers) ?? DEFAULT_LOYALTY_TIERS };
}
