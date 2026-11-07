import { formatSom, formatDateTime } from "./format";

export type ReceiptSettings = {
  storeName: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  telegramUsername: string | null;
  footer: string | null;
  autoPrint: boolean;
};

export type ReceiptSale = {
  items: { name: string; qty: number; price: number }[];
  total: number;
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
          .logo { max-width: 64px; max-height: 64px; margin: 0 auto 8px; display: block; }
          h1 { font-size: 16px; margin: 0 0 2px; }
          p { margin: 2px 0; font-size: 11px; }
          .divider { border-top: 1px dashed #999; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
          .total { font-weight: bold; font-size: 14px; }
          .qr { width: 110px; height: 110px; margin: 10px auto 2px; display: block; }
          .footer { margin-top: 6px; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center">
          ${settings.logoUrl ? `<img class="logo" src="${settings.logoUrl}" alt="" />` : ""}
          <h1>${escapeHtml(settings.storeName)}</h1>
          ${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ""}
          ${settings.phone ? `<p>${escapeHtml(settings.phone)}</p>` : ""}
        </div>
        <div class="divider"></div>
        <p>${formatDateTime(sale.createdAt)}</p>
        ${sale.customerName ? `<p>Mijoz: ${escapeHtml(sale.customerName)}</p>` : ""}
        <div class="divider"></div>
        ${rows}
        <div class="divider"></div>
        <div class="row total"><span>JAMI</span><span>${formatSom(sale.total)}</span></div>
        <p>To&apos;lov: ${METHOD_LABEL[sale.method] ?? sale.method}</p>
        ${qrDataUrl ? `<div class="center"><img class="qr" src="${qrDataUrl}" alt="" /></div>` : ""}
        ${
          settings.footer || settings.telegramUsername
            ? `<div class="footer">
                ${settings.footer ? `<p>${escapeHtml(settings.footer)}</p>` : ""}
                ${settings.telegramUsername ? `<p>Telegram: ${escapeHtml(settings.telegramUsername)}</p>` : ""}
              </div>`
            : ""
        }
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
