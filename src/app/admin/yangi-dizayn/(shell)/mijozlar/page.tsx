import { getSession } from "@/lib/auth";
import { getCustomerRows, getSegments } from "@/lib/customerRows";
import { getLoyaltyProgram } from "@/lib/loyaltyProgram";
import { BarchaMijozlarView } from "@/components/refine/mijozlar/BarchaMijozlarView";

export default async function NewDesignBarchaMijozlarPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; tag?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const [customers, segments, loyalty, params] = await Promise.all([
    getCustomerRows(session.storeId),
    getSegments(session.storeId),
    getLoyaltyProgram(session.storeId),
    searchParams,
  ]);

  const group = typeof params.group === "string" ? params.group : "";
  const tag = typeof params.tag === "string" ? params.tag : "";

  return (
    <BarchaMijozlarView
      key={`${group}|${tag}`}
      customers={customers}
      groups={segments.groups}
      tags={segments.tags}
      tiers={loyalty.enabled ? loyalty.tiers : null}
      initialGroup={group}
      initialTag={tag}
    />
  );
}
