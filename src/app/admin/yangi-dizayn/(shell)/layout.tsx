import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RefineShell } from "@/components/refine/RefineShell";

// Shared Refine shell (sidebar + top bar) for New design pages other than Kassa.
// Kassa (/admin/yangi-dizayn) keeps its own Figma layout and sits outside this route group.
export default async function NewDesignShellLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isEmployee = session.role === "EMPLOYEE";
  const [store, user] = await Promise.all([
    prisma.store.findUnique({ where: { id: session.storeId } }),
    isEmployee
      ? prisma.employee.findFirst({ where: { id: session.employeeId, active: true }, select: { name: true } })
      : prisma.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!store || !user) redirect("/login");

  return (
    <RefineShell storeName={store.name} userName={user.name}>
      {children}
    </RefineShell>
  );
}
