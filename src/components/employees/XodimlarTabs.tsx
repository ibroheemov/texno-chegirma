"use client";

import { useState } from "react";
import { Users, Truck, Package, ListChecks, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmployeeTable, type EmployeeRow } from "./EmployeeTable";
import { KuriyerlarTab } from "./KuriyerlarTab";
import { XodimlarYetkazishTab } from "./XodimlarYetkazishTab";
import { DavomatTab } from "./DavomatTab";
import { OylikTab } from "./OylikTab";

type Tab = "xodimlar" | "kuriyerlar" | "yetkazish" | "davomat" | "oylik";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "xodimlar", label: "Xodimlar", icon: Users },
  { key: "kuriyerlar", label: "Kuriyerlar", icon: Truck },
  { key: "yetkazish", label: "Yetkazish", icon: Package },
  { key: "davomat", label: "Davomat", icon: ListChecks },
  { key: "oylik", label: "Oylik", icon: Wallet },
];

export function XodimlarTabs({ employees }: { employees: EmployeeRow[] }) {
  const [tab, setTab] = useState<Tab>("xodimlar");

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name }));
  const courierOptions = employees.filter((e) => e.isCourier).map((e) => ({ id: e.id, name: e.name }));

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

      {tab === "xodimlar" && <EmployeeTable initialEmployees={employees} />}
      {tab === "kuriyerlar" && <KuriyerlarTab />}
      {tab === "yetkazish" && <XodimlarYetkazishTab couriers={courierOptions} />}
      {tab === "davomat" && <DavomatTab employees={employeeOptions} />}
      {tab === "oylik" && <OylikTab employees={employeeOptions} />}
    </div>
  );
}
