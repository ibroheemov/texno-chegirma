import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Ismni kiriting" }, { status: 400 });
  if (!body.login) return NextResponse.json({ error: "Login kiriting" }, { status: 400 });
  if (!body.password) return NextResponse.json({ error: "Parol kiriting" }, { status: 400 });

  const passwordHash = await bcrypt.hash(String(body.password), 10);

  const employee = await prisma.employee.create({
    data: {
      storeId: session.storeId,
      name: body.name,
      position: body.position || null,
      phone: body.phone || null,
      login: body.login,
      passwordHash,
      isCourier: Boolean(body.isCourier),
      hourlyRate: Number(body.hourlyRate ?? 0),
      photoUrl: body.photoUrl || null,
      allowedLocationName: body.allowedLocationName || null,
      allowedLat: body.allowedLat != null ? Number(body.allowedLat) : null,
      allowedLng: body.allowedLng != null ? Number(body.allowedLng) : null,
      allowedRadius: body.allowedRadius != null ? Number(body.allowedRadius) : 100,
    },
  });

  return NextResponse.json({ employee }, { status: 201 });
}
