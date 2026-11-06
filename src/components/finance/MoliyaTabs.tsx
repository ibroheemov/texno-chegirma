"use client";

import { useState } from "react";
import type { Product } from "@prisma/client";
import { Wallet, ArrowDownLeft, ArrowUpRight, Landmark, FileBarChart, HandCoins, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { FinanceView } from "./FinanceView";
import { KirimTab } from "./KirimTab";
import { ChiqimTab } from "./ChiqimTab";
import { HisobotTab } from "./HisobotTab";
import { TopshirishTab } from "./TopshirishTab";
import { TovarBeruvchiTab } from "./TovarBeruvchiTab";
import { CreditView } from "@/components/credit/CreditView";

type Tab = "kassa" | "kirim" | "chiqim" | "nasiya" | "hisobot" | "topshirish" | "tovar";

const TABS: { key: Tab; label: string; icon: typeof Wallet }[] = [
  { key: "kassa", label: "Kassa", icon: Wallet },
  { key: "kirim", label: "Kirim", icon: ArrowDownLeft },
  { key: "chiqim", label: "Chiqim", icon: ArrowUpRight },
  { key: "nasiya", label: "Nasiya", icon: Landmark },
  { key: "hisobot", label: "Hisobot", icon: FileBarChart },
  { key: "topshirish", label: "Topshirish", icon: HandCoins },
  { key: "tovar", label: "Tovar beruvchi", icon: Truck },
];

export function MoliyaTabs({
  products,
  usdRate,
  showDebtInUsdOnly,
}: {
  products: Product[];
  usdRate?: number | null;
  showDebtInUsdOnly?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("kassa");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors",
              tab === t.key && "bg-accent-soft text-accent"
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "kassa" && <FinanceView />}
      {tab === "kirim" && <KirimTab />}
      {tab === "chiqim" && <ChiqimTab />}
      {tab === "nasiya" && <CreditView />}
      {tab === "hisobot" && <HisobotTab />}
      {tab === "topshirish" && <TopshirishTab />}
      {tab === "tovar" && (
        <TovarBeruvchiTab products={products} usdRate={usdRate} showDebtInUsdOnly={showDebtInUsdOnly} />
      )}
    </div>
  );
}
