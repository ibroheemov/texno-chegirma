import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay } from "@/lib/stats";
import { distanceMeters } from "@/lib/geo";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/employees/[id]/attendance">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({ where: { id, storeId: session.storeId } });
  if (!employee) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  const status: "PRESENT" | "ABSENT" | "LATE" = body.status ?? "PRESENT";
  const today = startOfDay(new Date());
  const lat = body.lat != null ? Number(body.lat) : null;
  const lng = body.lng != null ? Number(body.lng) : null;

  let withinRange: boolean | null = null;
  if (status === "PRESENT" && lat != null && lng != null && employee.allowedLat != null && employee.allowedLng != null) {
    const dist = distanceMeters(lat, lng, employee.allowedLat, employee.allowedLng);
    withinRange = dist <= (employee.allowedRadius ?? 100);
  }

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: id, date: today } },
    update: {
      status,
      checkIn: status === "PRESENT" ? new Date() : null,
      checkInLat: lat,
      checkInLng: lng,
      withinRange,
    },
    create: {
      employeeId: id,
      date: today,
      status,
      checkIn: status === "PRESENT" ? new Date() : null,
      checkInLat: lat,
      checkInLng: lng,
      withinRange,
    },
  });

  return NextResponse.json({ attendance });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/employees/[id]/attendance">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({ where: { id, storeId: session.storeId } });
  if (!employee) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: id, date: today } } });
  if (!existing || !existing.checkIn) {
    return NextResponse.json({ error: "Avval kelganini belgilang" }, { status: 400 });
  }

  const attendance = await prisma.attendance.update({
    where: { employeeId_date: { employeeId: id, date: today } },
    data: { checkOut: new Date() },
  });

  return NextResponse.json({ attendance });
}
