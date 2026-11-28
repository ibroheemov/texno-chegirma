"use client";

import { useState } from "react";
import { Package, Truck } from "lucide-react";
import { OrdersPanel } from "./OrdersPanel";
import "./buyurtmalar.css";

type Section = "buyurtmalar" | "yetkazish";

const SECTIONS: { key: Section; label: string; icon: typeof Package }[] = [
  { key: "buyurtmalar", label: "Buyurtmalar", icon: Package },
  { key: "yetkazish", label: "Yetkazish", icon: Truck },
];

export function BuyurtmalarView() {
  const [section, setSection] = useState<Section>("buyurtmalar");

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Savdo
          </span>
          <h1 className="t-h1">Buyurtmalar</h1>
          <p className="t-body-sm">Onlayn buyurtmalar va yetkazib berish.</p>
        </div>
      </div>

      <div className="bo-seg-row">
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

      {section === "buyurtmalar" && <OrdersPanel variant="orders" />}
      {section === "yetkazish" && <OrdersPanel variant="delivery" />}
    </>
  );
}
