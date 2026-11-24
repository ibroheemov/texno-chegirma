import { startOfDay } from "./stats";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

/** Combines a day with an "HH:MM" string (local time). Returns null for empty, undefined for invalid. */
function atTime(day: Date, hhmm: unknown): Date | null | undefined {
  if (hhmm == null || hhmm === "") return null;
  const m = typeof hhmm === "string" ? /^(\d{1,2}):(\d{2})$/.exec(hhmm) : null;
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return undefined;
  const d = new Date(day);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/** Validates an admin's manual attendance edit and returns the values to store. */
export function parseAttendanceEdit(
  day: Date,
  body: { status?: unknown; checkInTime?: unknown; checkOutTime?: unknown }
): { error: string } | { status: AttendanceStatus; checkIn: Date | null; checkOut: Date | null } {
  const status = body.status;
  if (status !== "PRESENT" && status !== "ABSENT" && status !== "LATE") return { error: "Holat noto'g'ri" };
  if (status === "ABSENT") return { status, checkIn: null, checkOut: null };

  const checkIn = atTime(day, body.checkInTime);
  const checkOut = atTime(day, body.checkOutTime);
  if (checkIn === undefined || checkOut === undefined) return { error: "Vaqt noto'g'ri" };
  if (!checkIn) return { error: "Kelgan vaqtni kiriting" };
  if (checkOut && checkOut <= checkIn) return { error: "Chiqish vaqti kelgan vaqtdan keyin bo'lishi kerak" };
  return { status, checkIn, checkOut };
}

export function parseDayKey(key: unknown): Date | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}
