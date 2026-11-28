import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayYmd, toDebtRow } from "@/lib/debtBook";
import { QarzDaftariView } from "@/components/refine/QarzDaftariView";

export default async function NewDesignQarzDaftariPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "EMPLOYEE") redirect("/admin");

  const entries = await prisma.debtEntry.findMany({
    where: { storeId: session.storeId },
    include: { payments: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const today = todayYmd();
  return <QarzDaftariView rows={entries.map((entry) => toDebtRow(entry, today))} />;
}
