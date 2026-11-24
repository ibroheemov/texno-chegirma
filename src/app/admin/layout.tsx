import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
    <AdminShell storeName={store.name} userName={user.name} restricted={isEmployee}>
      {children}
    </AdminShell>
  );
}
