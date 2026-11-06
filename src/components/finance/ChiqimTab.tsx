"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Receipt } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatSom, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LedgerFormModal } from "./FinanceView";

type Period = "today" | "week" | "month" | "all";

type Entry = { id: string; amount: number; category: string | null; note: string | null; createdAt: string };
type Breakdown = {
  total: number;
  manualCount: number;
  byCategory: { category: string; amount: number; count: number }[];
  entries: Entry[];
};

export function ChiqimTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/finance/breakdown?direction=OUT&period=${period}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
    setActiveCategory(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const visibleEntries = activeCategory
    ? data?.entries.filter((e) => (e.category || "Boshqa") === activeCategory)
    : data?.entries;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "Bugun"],
                ["week", "Hafta"],
                ["month", "Oy"],
                ["all", "Barchasi"],
              ] as [Period, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
                  period === key && "border-accent bg-accent-soft text-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Xarajat qo&apos;shish
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Receipt size={16} className="text-danger" /> Jami xarajat
            </div>
            <p className="mt-2 text-2xl font-bold">{formatSom(data?.total ?? 0)}</p>
            <p className="mt-1 text-xs text-muted">{data?.manualCount ?? 0} ta xarajat</p>
          </Card>

          {data && data.byCategory.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Xarajat taqsimoti</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
                    !activeCategory && "border-accent bg-accent-soft text-accent"
                  )}
                >
                  Barchasi
                </button>
                {data.byCategory.map((c) => (
                  <button
                    key={c.category}
                    onClick={() => setActiveCategory(c.category)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
                      activeCategory === c.category && "border-accent bg-accent-soft text-accent"
                    )}
                  >
                    {c.category}
                    <Badge tone="neutral">{formatSom(c.amount)}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Xarajatlar ro&apos;yxati</h3>
            {!visibleEntries || visibleEntries.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Xarajat topilmadi</p>
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-border/60">
                {visibleEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{e.note || e.category || "Qo'lda kiritilgan"}</p>
                      <p className="text-xs text-muted">
                        {e.category && <>{e.category} · </>}
                        {formatDateTime(e.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-danger">-{formatSom(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <LedgerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        defaultDirection="OUT"
        lockDirection
      />
    </div>
  );
}
