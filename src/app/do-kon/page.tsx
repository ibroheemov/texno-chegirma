import { prisma } from "@/lib/prisma";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { Store } from "lucide-react";

// Shows live stock/prices, so it must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const store = await prisma.store.findFirst();
  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Do&apos;kon topilmadi
      </div>
    );
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, stock: { gt: 0 } },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Store size={20} />
          </span>
          <div>
            <h1 className="text-lg font-bold">{store.name}</h1>
            <p className="text-xs text-muted">Onlayn do&apos;kon</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <StorefrontView products={products} categories={categories} />
      </div>
    </div>
  );
}
