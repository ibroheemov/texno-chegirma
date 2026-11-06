export type PeriodValue =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "day"; date: string }
  | { kind: "month"; month: string }
  | { kind: "range"; from: string; to: string };

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toMonthInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function defaultPeriod(): PeriodValue {
  return { kind: "today" };
}

export function periodToParams(period: PeriodValue): URLSearchParams {
  const params = new URLSearchParams();
  params.set("period", period.kind);
  if (period.kind === "day") params.set("date", period.date);
  if (period.kind === "month") params.set("month", period.month);
  if (period.kind === "range") {
    params.set("from", period.from);
    params.set("to", period.to);
  }
  return params;
}

const MONTH_NAMES = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

export function periodLabel(period: PeriodValue) {
  switch (period.kind) {
    case "today":
      return "Bugun";
    case "yesterday":
      return "Kecha";
    case "day":
      return period.date || "Sana tanlanmagan";
    case "month": {
      const [y, m] = period.month.split("-").map(Number);
      if (!y || !m) return "Oy tanlanmagan";
      return `${MONTH_NAMES[m - 1]} ${y}`;
    }
    case "range":
      if (!period.from || !period.to) return "Oraliq tanlanmagan";
      return `${period.from} — ${period.to}`;
  }
}
