import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();
  if (!login || !password) {
    return NextResponse.json({ error: "Login va parolni kiriting" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  await createSession({ userId: user.id, storeId: user.storeId, role: user.role });
  return NextResponse.json({ ok: true });
}
