import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay } from "@/lib/stats";
import { distanceMeters } from "@/lib/geo";
import { euclideanDistance, FACE_MATCH_THRESHOLD } from "@/lib/faceMatch";

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
  const liveDescriptor: number[] | undefined = Array.isArray(body.faceDescriptor) ? body.faceDescriptor : undefined;

  let withinRange: boolean | null = null;
  if (status === "PRESENT" && employee.allowedLat != null && employee.allowedLng != null) {
    if (lat == null || lng == null) {
      return NextResponse.json({ error: "Joylashuvga ruxsat kerak" }, { status: 400 });
    }
    const dist = distanceMeters(lat, lng, employee.allowedLat, employee.allowedLng);
    withinRange = dist <= (employee.allowedRadius ?? 100);
    if (!withinRange) {
      return NextResponse.json({ error: "Siz do'kon hududidan tashqarisiz" }, { status: 400 });
    }
  }

  let faceVerified: boolean | null = null;
  if (status === "PRESENT" && employee.faceDescriptor) {
    if (!liveDescriptor) {
      return NextResponse.json({ error: "Yuzni tasdiqlash kerak" }, { status: 400 });
    }
    const stored: number[] = JSON.parse(employee.faceDescriptor);
    faceVerified = euclideanDistance(stored, liveDescriptor) <= FACE_MATCH_THRESHOLD;
    if (!faceVerified) {
      return NextResponse.json({ error: "Yuz tanilmadi" }, { status: 400 });
    }
  }

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: id, date: today } },
    update: {
      status,
      checkIn: status === "PRESENT" ? new Date() : null,
      checkInLat: lat,
      checkInLng: lng,
      withinRange,
      faceVerified,
    },
    create: {
      employeeId: id,
      date: today,
      status,
      checkIn: status === "PRESENT" ? new Date() : null,
      checkInLat: lat,
      checkInLng: lng,
      withinRange,
      faceVerified,
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

  // Optional { date: "YYYY-MM-DD", time: "HH:MM" } lets the admin fix a day
  // where the employee forgot to check out; default is "now, today".
  const body = await req.json().catch(() => ({}));
  const day = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? startOfDay(new Date(`${body.date}T00:00:00`)) : startOfDay(new Date());
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  const existing = await prisma.attendance.findFirst({ where: { employeeId: id, date: { gte: day, lt: nextDay } } });
  if (!existing || !existing.checkIn) {
    return NextResponse.json({ error: "Avval kelganini belgilang" }, { status: 400 });
  }

  let checkOut = new Date();
  if (typeof body.time === "string") {
    const m = /^(\d{1,2}):(\d{2})$/.exec(body.time);
    if (!m) return NextResponse.json({ error: "Vaqt noto'g'ri" }, { status: 400 });
    checkOut = new Date(day);
    checkOut.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (checkOut <= existing.checkIn) {
      return NextResponse.json({ error: "Chiqish vaqti kelgan vaqtdan keyin bo'lishi kerak" }, { status: 400 });
    }
  }

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut },
  });

  return NextResponse.json({ attendance });
}
