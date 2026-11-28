import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSegments } from "@/lib/customerRows";
import { GuruhlarView } from "@/components/refine/mijozlar/GuruhlarView";

export default async function NewDesignGuruhlarPage() {
  const session = await getSession();
  if (!session) return null;

  const [segments, totalCustomers] = await Promise.all([
    getSegments(session.storeId),
    prisma.customer.count({ where: { storeId: session.storeId } }),
  ]);

  return <GuruhlarView groups={segments.groups} tags={segments.tags} totalCustomers={totalCustomers} />;
}
