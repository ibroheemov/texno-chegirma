"use client";

import { useState } from "react";
import { Package, Truck, Users } from "lucide-react";
import type { CustomerRow } from "@/lib/types";
import { CustomersPanel } from "./CustomersPanel";
import { OrdersPanel } from "./OrdersPanel";
import "./mijozlar.css";

type Section = "mijozlar" | "buyurtmalar" | "yetkazish";

const SECTIONS: { key: Section; label: string; icon: typeof Users }[] = [
  { key: "mijozlar", label: "Mijozlar", icon: Users },
  { key: "buyurtmalar", label: "Buyurtmalar", icon: Package },
  { key: "yetkazish", label: "Yetkazish", icon: Truck },
];

export function MijozlarView({ customers }: { customers: CustomerRow[] }) {
  const [section, setSection] = useState<Section>("mijozlar");
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Savdo
          </span>
          <h1 className="t-h1">Mijozlar</h1>
          <p className="t-body-sm">Mijozlar, buyurtmalar, yetkazish va qarzlar.</p>
        </div>
      </div>

      <div className="mj-seg-row">
        <div className="seg" role="tablist" aria-label="Bo‘lim">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              type="button"
              key={key}
              role="tab"
              aria-selected={section === key}
              className={section === key ? "is-active" : ""}
              onClick={() => setSection(key)}
            >
              <Icon className="ic" size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {section === "mijozlar" && (
        <CustomersPanel
          customers={customers}
          formOpen={addOpen}
          onFormClose={() => setAddOpen(false)}
          onAdd={() => setAddOpen(true)}
        />
      )}
      {section === "buyurtmalar" && <OrdersPanel variant="orders" />}
      {section === "yetkazish" && <OrdersPanel variant="delivery" />}
    </>
  );
}
