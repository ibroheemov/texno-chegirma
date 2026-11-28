import { getSession } from "@/lib/auth";
import { getCustomerRows } from "@/lib/customerRows";
import { getLoyaltyProgram } from "@/lib/loyaltyProgram";
import { SodiqlikView } from "@/components/refine/mijozlar/SodiqlikView";

export default async function NewDesignSodiqlikPage() {
  const session = await getSession();
  if (!session) return null;

  const [rows, loyalty] = await Promise.all([getCustomerRows(session.storeId), getLoyaltyProgram(session.storeId)]);
  const customers = rows.map(({ id, name, phone, totalSpent, ordersCount }) => ({ id, name, phone, totalSpent, ordersCount }));

  return <SodiqlikView customers={customers} enabled={loyalty.enabled} saved={loyalty.saved} tiers={loyalty.tiers} />;
}
