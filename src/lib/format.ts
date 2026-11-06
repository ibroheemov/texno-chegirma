// Manual thousand-grouping instead of Intl.NumberFormat: Node's ICU data for
// "uz-UZ" can differ from the browser's, which causes SSR/client hydration
// mismatches. This is deterministic on both sides.
export function formatNumber(amount: number) {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + grouped;
}

export function formatSom(amount: number) {
  return formatNumber(amount) + " so'm";
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
