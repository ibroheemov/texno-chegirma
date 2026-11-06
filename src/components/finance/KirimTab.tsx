"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, ShoppingBag, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatSom, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LedgerFormModal } from "./FinanceView";

type Period = "today" | "week" | "month" | "all";

type Entry = { id: string; amount: number; category: string | null; note: string | null; createdAt: string };
type Breakdown = {
  salesTotal: number;
  salesCount: number;
  manualTotal: number;
  manualCount: number;
  byCategory: { category: string; amount: number; count: number }[];
  entries: Entry[];
};

export function KirimTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/finance/breakdown?direction=IN&period=${period}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

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
            <Plus size={16} /> Kirim qo&apos;shish
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                <ShoppingBag size={16} className="text-accent" /> Savdodan tushum
              </div>
              <p className="mt-2 text-2xl font-bold">{formatSom(data?.salesTotal ?? 0)}</p>
              <p className="mt-1 text-xs text-muted">{data?.salesCount ?? 0} ta sotuv</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                <PiggyBank size={16} className="text-accent" /> Qo&apos;shimcha kirim
              </div>
              <p className="mt-2 text-2xl font-bold">{formatSom(data?.manualTotal ?? 0)}</p>
              <p className="mt-1 text-xs text-muted">{data?.manualCount ?? 0} ta kirim</p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Qo&apos;shimcha kirimlar ro&apos;yxati</h3>
            {!data || data.entries.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Qo&apos;shimcha kirim yo&apos;q</p>
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-border/60">
                {data.entries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{e.category || e.note || "Qo'lda kiritilgan"}</p>
                      <p className="text-xs text-muted">{formatDateTime(e.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-accent">+{formatSom(e.amount)}</span>
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
        defaultDirection="IN"
        lockDirection
      />
    </div>
  );
}
