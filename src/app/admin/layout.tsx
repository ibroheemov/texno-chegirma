import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [store, user] = await Promise.all([
    prisma.store.findUnique({ where: { id: session.storeId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!store || !user) redirect("/login");

  return (
    <AdminShell storeName={store.name} userName={user.name}>
      {children}
    </AdminShell>
  );
}
