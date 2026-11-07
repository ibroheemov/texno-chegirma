"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatSom, formatDateTime } from "@/lib/format";
import {
  printReceipt,
  generateQrDataUrl,
  telegramUrl,
  METHOD_LABEL,
  type ReceiptSettings,
  type ReceiptSale,
} from "@/lib/receipt";

export function ReceiptModal({
  open,
  onClose,
  sale,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  sale: ReceiptSale | null;
  settings: ReceiptSettings;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !settings.telegramUsername) return;
    let cancelled = false;
    generateQrDataUrl(telegramUrl(settings.telegramUsername)).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, settings.telegramUsername]);

  return (
    <Modal open={open && !!sale} onClose={onClose} title="Chek">
      {sale && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-dashed border-border p-4 font-mono text-xs text-foreground">
            <div className="text-center">
              {settings.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoUrl} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" />
              )}
              <p className="text-sm font-bold">{settings.storeName}</p>
              {settings.address && <p className="text-muted">{settings.address}</p>}
              {settings.phone && <p className="text-muted">{settings.phone}</p>}
            </div>

            <div className="my-2 border-t border-dashed border-border" />
            <p className="text-muted">{formatDateTime(sale.createdAt)}</p>
            {sale.customerName && <p className="text-muted">Mijoz: {sale.customerName}</p>}

            <div className="my-2 border-t border-dashed border-border" />
            <div className="flex flex-col gap-1">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-2">
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <span>{formatSom(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="my-2 border-t border-dashed border-border" />
            <div className="flex justify-between text-sm font-bold">
              <span>JAMI</span>
              <span>{formatSom(sale.total)}</span>
            </div>
            <p className="mt-1 text-muted">To&apos;lov: {METHOD_LABEL[sale.method] ?? sale.method}</p>

            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="" className="mx-auto mt-3 h-24 w-24" />
            )}
            {(settings.footer || settings.telegramUsername) && (
              <div className="mt-2 text-center text-muted">
                {settings.footer && <p>{settings.footer}</p>}
                {settings.telegramUsername && <p>Telegram: {settings.telegramUsername}</p>}
              </div>
            )}
          </div>

          <Button onClick={() => void printReceipt(sale, settings)}>
            <Printer size={16} /> Chop etish
          </Button>
        </div>
      )}
    </Modal>
  );
}
