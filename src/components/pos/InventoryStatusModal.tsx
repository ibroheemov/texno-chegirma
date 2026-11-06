"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

export function InventoryStatusModal({
  open,
  onClose,
  total,
  available,
  low,
  out,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  available: number;
  low: number;
  out: number;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Ombor holati">
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-surface-muted p-3 text-center">
          <p className="text-xs text-muted">Jami mahsulot</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
            <span className="text-muted">Mavjud</span>
            <Badge tone="accent">{available} ta</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
            <span className="text-muted">Kam qolgan</span>
            <Badge tone="warning">{low} ta</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
            <span className="text-muted">Tugagan</span>
            <Badge tone="danger">{out} ta</Badge>
          </div>
        </div>
        <Link
          href="/admin/ombor"
          onClick={onClose}
          className="mt-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Omborni ko&apos;rish
        </Link>
      </div>
    </Modal>
  );
}
