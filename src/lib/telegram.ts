import { formatSom } from "./format";

type OrderNotification = {
  storeName: string;
  customerName: string;
  customerPhone: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
};

// Sends a Telegram message when a new online order comes in. No-op unless a
// bot token and chat id are available — either passed in (Sozlamalar →
// Telegram bot, stored on Store) or via the TELEGRAM_BOT_TOKEN /
// TELEGRAM_CHAT_ID env vars as a fallback.
export async function notifyNewOrder(
  order: OrderNotification,
  credentials?: { token?: string | null; chatId?: string | null }
) {
  const token = credentials?.token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = credentials?.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lines = [
    `🛒 *Yangi buyurtma* — ${order.storeName}`,
    `Mijoz: ${order.customerName} (${order.customerPhone})`,
    "",
    ...order.items.map((i) => `• ${i.name} × ${i.qty} = ${formatSom(i.price * i.qty)}`),
    "",
    `*Jami: ${formatSom(order.total)}*`,
  ];

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n"),
      parse_mode: "Markdown",
    }),
  });
}
