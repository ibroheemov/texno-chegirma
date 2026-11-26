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
                <img src={settings.logoUrl} alt="" className="mx-auto mb-2 h-12 w-auto max-w-[120px] object-contain" />
              )}
            </div>

            <p className="mt-4 text-muted">{formatDateTime(sale.createdAt)}</p>
            {sale.customerName && <p className="text-muted">Mijoz: {sale.customerName}</p>}

            <div className="my-2 border-t border-dashed border-border" />
            <div className="flex flex-col gap-1">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    {item.name} × {item.qty}
                  </span>
                  <span className="shrink-0 whitespace-nowrap">{formatSom(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            {!!sale.discountAmount && (
              <div className="mt-2 flex justify-between gap-3 text-muted">
                <span>Chegirma</span>
                <span className="shrink-0 whitespace-nowrap">-{formatSom(sale.discountAmount)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between gap-3 border-t border-dashed border-border pt-2 text-sm font-bold">
              <span>JAMI</span>
              <span className="shrink-0 whitespace-nowrap">{formatSom(sale.total)}</span>
            </div>
            <p className="mt-1 text-muted">To&apos;lov: {METHOD_LABEL[sale.method] ?? sale.method}</p>

            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="" className="mx-auto my-4 h-24 w-24" />
            )}
            {(settings.footer ||
              settings.instagramUsername ||
              settings.telegramBotUsername ||
              settings.telegramChannelUsername) && (
              <div className="mt-2 text-center text-muted">
                {settings.footer && <p>{settings.footer}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  {settings.instagramUsername && (
                    <p className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="18" cy="6" r="1.25" fill="currentColor" />
                      </svg>
                      {settings.instagramUsername}
                    </p>
                  )}
                  {settings.telegramBotUsername && (
                    <p className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M22 3.2 18.7 20c-.25 1.18-.95 1.46-1.92.91l-5.3-3.91-2.56 2.46c-.28.28-.52.52-1.06.52l.38-5.4 9.83-8.88c.43-.38-.09-.59-.66-.21L5.25 13.17.03 11.54c-1.13-.35-1.15-1.13.24-1.68L20.7 1.98c.94-.34 1.76.23 1.3 1.22Z"
                        />
                      </svg>
                      {settings.telegramBotUsername}
                    </p>
                  )}
                  {settings.telegramChannelUsername && (
                    <p className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M22 3.2 18.7 20c-.25 1.18-.95 1.46-1.92.91l-5.3-3.91-2.56 2.46c-.28.28-.52.52-1.06.52l.38-5.4 9.83-8.88c.43-.38-.09-.59-.66-.21L5.25 13.17.03 11.54c-1.13-.35-1.15-1.13.24-1.68L20.7 1.98c.94-.34 1.76.23 1.3 1.22Z"
                        />
                      </svg>
                      {settings.telegramChannelUsername}
                    </p>
                  )}
                </div>
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
