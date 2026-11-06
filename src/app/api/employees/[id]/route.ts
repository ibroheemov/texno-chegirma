import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/employees/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({ where: { id, storeId: session.storeId } });
  if (!employee) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.employee.update({
    where: { id },
    data: {
      name: body.name,
      position: body.position || null,
      phone: body.phone || null,
      salary: Number(body.salary ?? 0),
      hourlyRate: Number(body.hourlyRate ?? employee.hourlyRate),
      login: body.login || employee.login,
      passwordHash: body.password ? await bcrypt.hash(String(body.password), 10) : employee.passwordHash,
      isCourier: body.isCourier ?? employee.isCourier,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl || null : employee.photoUrl,
      allowedLocationName:
        body.allowedLocationName !== undefined ? body.allowedLocationName || null : employee.allowedLocationName,
      allowedLat: body.allowedLat !== undefined ? (body.allowedLat != null ? Number(body.allowedLat) : null) : employee.allowedLat,
      allowedLng: body.allowedLng !== undefined ? (body.allowedLng != null ? Number(body.allowedLng) : null) : employee.allowedLng,
      allowedRadius:
        body.allowedRadius !== undefined ? (body.allowedRadius != null ? Number(body.allowedRadius) : null) : employee.allowedRadius,
      active: body.active ?? employee.active,
    },
  });
  return NextResponse.json({ employee: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/employees/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({ where: { id, storeId: session.storeId } });
  if (!employee) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
