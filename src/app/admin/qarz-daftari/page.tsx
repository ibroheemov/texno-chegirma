import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayYmd, toDebtRow } from "@/lib/debtBook";
import { QarzDaftariView } from "@/components/refine/QarzDaftariView";
import { RefineEmbed } from "@/components/refine/RefineEmbed";

// Qarz daftari inside the Old design shell (Old sidebar and header). The same view also has a
// New design route at /admin/yangi-dizayn/qarz-daftari.
export default async function QarzDaftariPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "EMPLOYEE") redirect("/admin");

  const entries = await prisma.debtEntry.findMany({
    where: { storeId: session.storeId },
    include: { payments: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const today = todayYmd();
  return (
    <RefineEmbed>
      <QarzDaftariView rows={entries.map((entry) => toDebtRow(entry, today))} />
    </RefineEmbed>
  );
}
