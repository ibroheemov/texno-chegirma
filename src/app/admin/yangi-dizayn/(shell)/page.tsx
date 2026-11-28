import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncUsdPrices } from "@/lib/usdRate";
import { PosView } from "@/components/pos/PosView";

export default async function NewDesignKassaPage() {
  const session = await getSession();
  if (!session) return null;

  await syncUsdPrices(session.storeId);

  const isEmployee = session.role === "EMPLOYEE";
  const [products, categories, customers, store, employees, currentUser] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.storeId, stock: { gt: 0 } },
      orderBy: { name: "asc" },
      take: 24,
      include: { category: true },
    }),
    prisma.category.findMany({ where: { storeId: session.storeId }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { storeId: session.storeId }, orderBy: { name: "asc" } }),
    prisma.store.findUnique({ where: { id: session.storeId } }),
    isEmployee
      ? Promise.resolve([] as { id: string; name: string }[])
      : prisma.employee.findMany({
          where: { storeId: session.storeId, active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
    isEmployee
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, select: { name: true } })
      : prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ]);

  const receipt = {
    storeName: store?.name ?? "",
    phone: store?.phone ?? null,
    address: store?.address ?? null,
    logoUrl: store?.logoUrl || "/logo.png",
    telegramUsername: store?.telegramUsername ?? null,
    instagramUsername: store?.instagramUsername ?? null,
    telegramBotUsername: store?.telegramBotUsername ?? null,
    telegramChannelUsername: store?.telegramChannelUsername ?? null,
    footer: store?.receiptFooter ?? null,
    autoPrint: store?.autoPrintReceipt ?? false,
  };

  return (
    <PosView
      design="figma"
      initialProducts={products}
      categories={categories}
      customers={customers}
      employees={employees}
      currentUserName={currentUser?.name ?? "Men"}
      enableMixedPayment={store?.enableMixedPayment ?? true}
      customPaymentMethods={Array.isArray(store?.customPaymentMethods) ? (store.customPaymentMethods as string[]) : []}
      deferredPaymentMethods={
        store?.deferredPaymentMethods && typeof store.deferredPaymentMethods === "object"
          ? (store.deferredPaymentMethods as Record<string, boolean>)
          : {}
      }
      receipt={receipt}
    />
  );
}
