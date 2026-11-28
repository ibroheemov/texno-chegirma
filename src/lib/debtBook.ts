// Shared helpers for "Qarz daftari" (the standalone debt ledger, see DebtEntry in schema.prisma).
//
// Dates: the store works in Uzbekistan (UTC+5, no DST). A due date is stored as UTC midnight of the
// chosen day and every date is shown/compared as a calendar day in that zone, so the server's own
// time zone never changes what the user sees.

export type DebtStatus = "PENDING" | "OVERDUE" | "PAID" | "CANCELED";

export type DebtPaymentRow = {
  id: string;
  amount: number;
  note: string | null;
  /** YYYY-MM-DD */
  date: string;
};

export type DebtRow = {
  id: string;
  debtorName: string;
  phone: string | null;
  item: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  /** YYYY-MM-DD */
  dueDate: string;
  note: string | null;
  status: DebtStatus;
  payments: DebtPaymentRow[];
};

/** Category of the Moliya cash-ledger entry created for every Qarz daftari payment. */
export const DEBT_BOOK_LEDGER_CATEGORY = "Qarz daftari";

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Calendar day (YYYY-MM-DD) of `date` in the store's time zone. */
export function ymd(date: Date) {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayYmd(now: Date = new Date()) {
  return ymd(now);
}

export function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function dueDateFromYmd(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Payment moment for a chosen day: "now" for today, otherwise noon of that day. */
export function paymentDateFromYmd(value: string, now: Date = new Date()) {
  if (value === todayYmd(now)) return now;
  return new Date(`${value}T07:00:00.000Z`);
}

type StatusInput = { totalAmount: number; paidAmount: number; canceledAt: Date | null; dueDate: Date };

export function debtStatus(entry: StatusInput, today: string): DebtStatus {
  if (entry.canceledAt) return "CANCELED";
  if (entry.paidAmount >= entry.totalAmount) return "PAID";
  return ymd(entry.dueDate) < today ? "OVERDUE" : "PENDING";
}

type EntryWithPayments = StatusInput & {
  id: string;
  debtorName: string;
  phone: string | null;
  item: string;
  note: string | null;
  payments: { id: string; amount: number; note: string | null; createdAt: Date }[];
};

export function toDebtRow(entry: EntryWithPayments, today: string): DebtRow {
  return {
    id: entry.id,
    debtorName: entry.debtorName,
    phone: entry.phone,
    item: entry.item,
    totalAmount: entry.totalAmount,
    paidAmount: entry.paidAmount,
    remaining: Math.max(entry.totalAmount - entry.paidAmount, 0),
    dueDate: ymd(entry.dueDate),
    note: entry.note,
    status: debtStatus(entry, today),
    payments: entry.payments.map((p) => ({ id: p.id, amount: p.amount, note: p.note, date: ymd(p.createdAt) })),
  };
}

export type DebtInput = {
  debtorName: string;
  phone: string | null;
  item: string;
  totalAmount: number;
  dueDate: string;
  note: string | null;
};

/** Validates the create/edit body. Returns the cleaned values or an error message (in Uzbek). */
export function parseDebtBody(body: unknown): { data: DebtInput } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const debtorName = text(b.debtorName);
  if (!debtorName) return { error: "Qarzdor ismini kiriting" };
  const item = text(b.item);
  if (!item) return { error: "Nima olinganini kiriting" };
  const totalAmount = Number(b.totalAmount);
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) return { error: "Jami summani kiriting" };
  if (!isValidYmd(b.dueDate)) return { error: "Qaytarish muddatini kiriting" };

  return {
    data: {
      debtorName,
      phone: text(b.phone) || null,
      item,
      totalAmount,
      dueDate: b.dueDate,
      note: text(b.note) || null,
    },
  };
}
