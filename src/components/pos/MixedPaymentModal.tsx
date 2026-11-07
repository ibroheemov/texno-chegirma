"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

export function MixedPaymentModal({
  open,
  onClose,
  total,
  cash,
  card,
  credit,
  customMethods,
  customAmounts,
  onChangeCash,
  onChangeCard,
  onChangeCredit,
  onChangeCustom,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  cash: number;
  card: number;
  credit: number;
  customMethods: string[];
  customAmounts: Record<string, number>;
  onChangeCash: (v: number) => void;
  onChangeCard: (v: number) => void;
  onChangeCredit: (v: number) => void;
  onChangeCustom: (name: string, v: number) => void;
  onConfirm: () => void;
}) {
  const customTotal = customMethods.reduce((sum, m) => sum + (customAmounts[m] ?? 0), 0);
  const entered = cash + card + credit + customTotal;
  const remaining = total - entered;
  const balanced = remaining === 0 && total > 0;

  const rows: { label: string; value: number; onChange: (v: number) => void }[] = [
    { label: "Naqd", value: cash, onChange: onChangeCash },
    { label: "Karta", value: card, onChange: onChangeCard },
    { label: "Nasiya", value: credit, onChange: onChangeCredit },
    ...customMethods.map((m) => ({
      label: m,
      value: customAmounts[m] ?? 0,
      onChange: (v: number) => onChangeCustom(m, v),
    })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Aralash to'lov">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-lg bg-surface-muted p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Jami summa:</span>
            <span className="font-semibold">{formatSom(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Kiritildi:</span>
            <span className="font-semibold">{formatSom(entered)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Qoldi:</span>
            <span className={cn("font-semibold", remaining === 0 ? "text-accent" : "text-danger")}>
              {formatSom(remaining)}
            </span>
          </div>
        </div>

        <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <label className="w-16 shrink-0 truncate text-xs font-medium text-muted" title={row.label}>
                {row.label}
              </label>
              <input
                type="number"
                value={row.value}
                min={0}
                onChange={(e) => row.onChange(Math.max(0, Number(e.target.value) || 0))}
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => row.onChange(Math.max(0, row.value + remaining))}
                className="shrink-0 text-xs font-medium text-accent hover:underline"
              >
                To&apos;ldirish
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button className="flex-1" disabled={!balanced} onClick={onConfirm}>
            Tasdiqlash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
