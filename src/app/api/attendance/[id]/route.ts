import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay } from "@/lib/stats";
import { parseAttendanceEdit } from "@/lib/attendanceEdit";

// Admin-only: correct or remove an attendance record.
async function load(ctx: RouteContext<"/api/attendance/[id]">) {
  const session = await getSession();
  if (!session) return { res: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
  if (session.role === "EMPLOYEE") return { res: NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 }) };
  const { id } = await ctx.params;
  const record = await prisma.attendance.findFirst({ where: { id, employee: { storeId: session.storeId } } });
  if (!record) return { res: NextResponse.json({ error: "Topilmadi" }, { status: 404 }) };
  return { record };
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/attendance/[id]">) {
  const { res, record } = await load(ctx);
  if (!record) return res;
  const parsed = parseAttendanceEdit(startOfDay(record.date), await req.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const attendance = await prisma.attendance.update({ where: { id: record.id }, data: parsed });
  return NextResponse.json({ attendance });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/attendance/[id]">) {
  const { res, record } = await load(ctx);
  if (!record) return res;
  await prisma.attendance.delete({ where: { id: record.id } });
  return NextResponse.json({ ok: true });
}
