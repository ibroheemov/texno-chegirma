import { prisma } from "./prisma";
import { formatDate } from "./format";

// Ledger entries tagged with this category are cash movements for buying
// inventory from suppliers. They reduce the cash balance like any other
// outflow, but are excluded from the "Xarajat" (operating expense) total in
// the P&L report, since the cost of goods sold is already recognized via
// Sale/SaleItem.costPrice at sale time — counting it again here would
// double-count it against profit.
export const SUPPLIER_PAYMENT_CATEGORY = "Tovar xaridi";

// Ledger entries tagged with this category are the cash reversal created
// when a sale is canceled (money handed back to the customer). The original
// sale stays visible in Kassa harakatlari as a historical record, but
// neither it nor this reversal count toward revenue/expense totals —
// matching "Bekor qilingan va qaytarilgan savdolar ko'rsatkichlarga kirmaydi".
export const SALE_CANCEL_CATEGORY = "Savdo bekor qilish";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isoDate(d: Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export async function getDaySummary(storeId: string, day: Date) {
  const start = startOfDay(day);
  const end = endOfDay(day);

  const sales = await prisma.sale.findMany({
    where: { storeId, createdAt: { gte: start, lte: end }, canceled: false },
    include: { items: true },
  });

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const receipts = sales.length;
  const itemsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.qty, 0),
    0
  );
  const distinctProducts = new Set(
    sales.flatMap((s) => s.items.map((i) => i.productId))
  ).size;

  return { totalSales, totalProfit, receipts, itemsSold, distinctProducts };
}

export async function getRangeSummary(storeId: string, start: Date, end: Date) {
  const sales = await prisma.sale.findMany({
    where: { storeId, createdAt: { gte: start, lte: end }, canceled: false },
    include: { items: true, customer: true },
    orderBy: { createdAt: "desc" },
  });

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const costTotal = totalSales - totalProfit;
  const receipts = sales.length;
  const itemsSoldQty = sales.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.qty, 0),
    0
  );
  const distinctProducts = new Set(
    sales.flatMap((s) => s.items.map((i) => i.productId))
  ).size;

  const payments = sales.reduce(
    (acc, s) => {
      acc.cash += s.cashAmount;
      acc.card += s.cardAmount;
      acc.credit += s.creditAmount;
      return acc;
    },
    { cash: 0, card: 0, credit: 0 }
  );

  const salesList = sales.slice(0, 50).map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    paymentMethod: s.paymentMethod,
    total: s.total,
    customerName: s.customer?.name ?? null,
    items: s.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  }));

  const itemTotals = new Map<string, { name: string; qty: number; amount: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = itemTotals.get(item.productId);
      const amount = item.price * item.qty;
      if (existing) {
        existing.qty += item.qty;
        existing.amount += amount;
      } else {
        itemTotals.set(item.productId, { name: item.name, qty: item.qty, amount });
      }
    }
  }
  const items = Array.from(itemTotals.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 50);

  return {
    totalSales,
    costTotal,
    totalProfit,
    receipts,
    itemsSoldQty,
    distinctProducts,
    payments,
    sales: salesList,
    items,
  };
}

export async function getInventorySummary(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { price: true, costPrice: true, stock: true },
  });

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCostValue = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
  const totalSaleValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  const credits = await prisma.creditLedger.findMany({
    where: { storeId },
    include: { sale: { include: { items: true } } },
  });

  let creditGoodsCost = 0;
  let outstandingDebt = 0;
  for (const c of credits) {
    const remaining = c.totalAmount - c.paidAmount;
    if (remaining <= 0) continue;
    outstandingDebt += remaining;
    if (c.sale) {
      const saleCost = c.sale.items.reduce((sum, i) => sum + i.costPrice * i.qty, 0);
      const proportion = c.sale.total > 0 ? c.totalAmount / c.sale.total : 1;
      creditGoodsCost += saleCost * proportion;
    }
  }

  return { totalStock, totalCostValue, totalSaleValue, creditGoodsCost, outstandingDebt };
}

export function moliyaPeriodStart(period: string): Date | null {
  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "week") {
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === "month") {
    start.setMonth(start.getMonth() - 1);
    return start;
  }
  return null;
}

export async function getFinanceReport(storeId: string, period: string) {
  const start = moliyaPeriodStart(period);
  const end = new Date();

  const entries = await prisma.ledgerEntry.findMany({
    where: { storeId, ...(start ? { createdAt: { gte: start } } : {}) },
    orderBy: { createdAt: "asc" },
  });

  const sales = await prisma.sale.findMany({
    where: { storeId, canceled: false, ...(start ? { createdAt: { gte: start } } : {}) },
    include: { items: true },
  });

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cogs = sales.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.costPrice * i.qty, 0),
    0
  );

  const expenseEntries = entries.filter(
    (e) =>
      e.direction === "OUT" &&
      e.category !== SUPPLIER_PAYMENT_CATEGORY &&
      e.category !== SALE_CANCEL_CATEGORY
  );
  const expense = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = revenue - cogs - expense;

  const paymentTotals = new Map<string, number>();
  for (const s of sales) {
    if (s.cashAmount > 0) paymentTotals.set("Naqd", (paymentTotals.get("Naqd") ?? 0) + s.cashAmount);
    if (s.cardAmount > 0) paymentTotals.set("Karta", (paymentTotals.get("Karta") ?? 0) + s.cardAmount);
    if (s.creditAmount > 0) paymentTotals.set("Nasiya", (paymentTotals.get("Nasiya") ?? 0) + s.creditAmount);
  }
  const paymentTotal = Array.from(paymentTotals.values()).reduce((a, b) => a + b, 0);
  const paymentBreakdown = Array.from(paymentTotals.entries()).map(([method, amount]) => ({
    method,
    amount,
    pct: paymentTotal > 0 ? Math.round((amount / paymentTotal) * 100) : 0,
  }));

  const expenseByCategory = new Map<string, number>();
  for (const e of expenseEntries) {
    const key = e.category || "Boshqa";
    expenseByCategory.set(key, (expenseByCategory.get(key) ?? 0) + e.amount);
  }

  const dayMap = new Map<string, { revenue: number; expense: number }>();
  for (const s of sales) {
    const key = isoDate(s.createdAt);
    const d = dayMap.get(key) ?? { revenue: 0, expense: 0 };
    d.revenue += s.total;
    dayMap.set(key, d);
  }
  for (const e of expenseEntries) {
    const key = isoDate(e.createdAt);
    const d = dayMap.get(key) ?? { revenue: 0, expense: 0 };
    d.expense += e.amount;
    dayMap.set(key, d);
  }
  const dailyBreakdown = Array.from(dayMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({
      date: formatDate(key),
      revenue: v.revenue,
      expense: v.expense,
      netProfit: v.revenue - v.expense,
    }));

  return {
    revenue,
    cogs,
    expense,
    netProfit,
    paymentBreakdown,
    expenseByCategory: Array.from(expenseByCategory.entries()).map(([category, amount]) => ({ category, amount })),
    dailyBreakdown,
  };
}

export function resolvePeriodRange(
  period: string,
  params: { date?: string | null; month?: string | null; from?: string | null; to?: string | null }
) {
  const now = new Date();
  switch (period) {
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "day": {
      const d = params.date ? new Date(params.date) : now;
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "month": {
      const [y, m] = (params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
        .split("-")
        .map(Number);
      const start = new Date(y, (m || 1) - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m || 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "range": {
      const from = params.from ? new Date(params.from) : now;
      const to = params.to ? new Date(params.to) : now;
      return { start: startOfDay(from), end: endOfDay(to) };
    }
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}
