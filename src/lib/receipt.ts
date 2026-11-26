import { formatSom, formatDateTime } from "./format";

export type ReceiptSettings = {
  storeName: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  telegramUsername: string | null;
  instagramUsername: string | null;
  telegramBotUsername: string | null;
  telegramChannelUsername: string | null;
  footer: string | null;
  autoPrint: boolean;
};

export type ReceiptSale = {
  items: { name: string; qty: number; price: number }[];
  total: number;
  discountAmount?: number;
  method: string;
  customerName: string | null;
  createdAt: Date | string;
};

export const METHOD_LABEL: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  CREDIT: "Nasiya",
  MIXED: "Aralash",
};

// A sale paid entirely through one store-defined custom payment method is
// stored with paymentMethod "CUSTOM" (to distinguish it from a genuine
// multi-method MIXED sale); its real label lives in customAmounts' single key.
export function resolveMethodLabel(method: string, customAmounts?: unknown): string {
  if (method === "CUSTOM" && customAmounts && typeof customAmounts === "object") {
    const keys = Object.keys(customAmounts as Record<string, number>);
    if (keys.length === 1) return keys[0];
  }
  return METHOD_LABEL[method] ?? method;
}

export function telegramUrl(username: string) {
  return `https://t.me/${username.replace(/^@/, "")}`;
}

export async function generateQrDataUrl(data: string): Promise<string | null> {
  try {
    const QRCode = await import("qrcode");
    return await QRCode.toDataURL(data, { width: 160, margin: 1 });
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function socialIcon(type: "instagram" | "telegram") {
  if (type === "instagram") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="6" r="1.25" fill="currentColor"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 3.2 18.7 20c-.25 1.18-.95 1.46-1.92.91l-5.3-3.91-2.56 2.46c-.28.28-.52.52-1.06.52l.38-5.4 9.83-8.88c.43-.38-.09-.59-.66-.21L5.25 13.17.03 11.54c-1.13-.35-1.15-1.13.24-1.68L20.7 1.98c.94-.34 1.76.23 1.3 1.22Z"/></svg>`;
}

function socialLinksMarkup(settings: ReceiptSettings) {
  const links = [
    { type: "instagram" as const, username: settings.instagramUsername },
    { type: "telegram" as const, username: settings.telegramBotUsername },
    { type: "telegram" as const, username: settings.telegramChannelUsername },
  ].filter((link) => link.username);

  if (!links.length) return "";
  return `<div class="socials">${links
    .map(
      ({ type, username }) =>
        `<span class="social">${socialIcon(type)}<span>${escapeHtml(username!)}</span></span>`
    )
    .join("")}</div>`;
}

export async function printReceipt(sale: ReceiptSale, settings: ReceiptSettings) {
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;
  const rows = sale.items
    .map(
      (i) => `
      <div class="row">
        <span>${escapeHtml(i.name)} × ${i.qty}</span>
        <span>${formatSom(i.price * i.qty)}</span>
      </div>`
    )
    .join("");

  const qrDataUrl = settings.telegramUsername
    ? await generateQrDataUrl(telegramUrl(settings.telegramUsername))
    : null;

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Chek</title>
        <style>
          body { font-family: monospace; width: 280px; margin: 0 auto; padding: 16px; color: #111; }
          .center { text-align: center; }
          .logo { max-width: 120px; max-height: 64px; margin: 0 auto 8px; display: block; }
          h1 { font-size: 16px; margin: 0 0 2px; }
          p { margin: 2px 0; font-size: 11px; }
          .divider { border-top: 1px dashed #999; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 2px 0; }
          .row span:first-child { flex: 1; min-width: 0; }
          .row span:last-child { flex: none; white-space: nowrap; }
          .total { margin-top: 6px; font-weight: bold; font-size: 14px; }
          .qr { width: 110px; height: 110px; margin: 14px auto; display: block; }
          .footer { margin-top: 6px; font-size: 11px; text-align: center; }
          .socials { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 8px; }
          .social { display: flex; align-items: center; gap: 5px; }
          .social { white-space: nowrap; }
          .social svg { width: 14px; height: 14px; flex: none; }
        </style>
      </head>
      <body>
        <div class="center">
          ${settings.logoUrl ? `<img class="logo" src="${settings.logoUrl.startsWith("/") ? window.location.origin + settings.logoUrl : settings.logoUrl}" alt="" />` : ""}
        </div>
        <p style="margin-top: 14px">${formatDateTime(sale.createdAt)}</p>
        ${sale.customerName ? `<p>Mijoz: ${escapeHtml(sale.customerName)}</p>` : ""}
        <div class="divider"></div>
        ${rows}
        ${sale.discountAmount ? `<div class="row"><span>Chegirma</span><span>-${formatSom(sale.discountAmount)}</span></div>` : ""}
        <div class="row total"><span>JAMI</span><span>${formatSom(sale.total)}</span></div>
        <p>To&apos;lov: ${METHOD_LABEL[sale.method] ?? sale.method}</p>
        ${qrDataUrl ? `<div class="center"><img class="qr" src="${qrDataUrl}" alt="" /></div>` : ""}
        ${
          settings.footer || settings.instagramUsername || settings.telegramBotUsername || settings.telegramChannelUsername
            ? `<div class="footer">
                ${settings.footer ? `<p>${escapeHtml(settings.footer)}</p>` : ""}
                ${socialLinksMarkup(settings)}
              </div>`
            : ""
        }
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
