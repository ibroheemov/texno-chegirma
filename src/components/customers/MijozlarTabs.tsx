"use client";

import { useState } from "react";
import { Users, Package, Truck, Landmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { CustomerTable } from "./CustomerTable";
import { OrdersDataView } from "@/components/orders/OrdersDataView";
import { CreditView } from "@/components/credit/CreditView";
import type { CustomerRow } from "@/lib/types";

type Tab = "mijozlar" | "buyurtmalar" | "yetkazish" | "qarzdorlar";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "mijozlar", label: "Mijozlar", icon: Users },
  { key: "buyurtmalar", label: "Buyurtmalar", icon: Package },
  { key: "yetkazish", label: "Yetkazish", icon: Truck },
  { key: "qarzdorlar", label: "Qarzdorlar", icon: Landmark },
];

export function MijozlarTabs({ customers }: { customers: CustomerRow[] }) {
  const [tab, setTab] = useState<Tab>("mijozlar");

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

      {tab === "mijozlar" && <CustomerTable initialCustomers={customers} />}
      {tab === "buyurtmalar" && <OrdersDataView variant="orders" />}
      {tab === "yetkazish" && <OrdersDataView variant="delivery" />}
      {tab === "qarzdorlar" && <CreditView />}
    </div>
  );
}
