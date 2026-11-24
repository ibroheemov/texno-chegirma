import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();
  if (!login || !password) {
    return NextResponse.json({ error: "Login va parolni kiriting" }, { status: 400 });
  }

  const invalid = NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { login } });
  if (user) {
    if (!(await bcrypt.compare(password, user.password))) return invalid;
    await createSession({ userId: user.id, storeId: user.storeId, role: user.role });
    return NextResponse.json({ ok: true });
  }

  // Not an admin/cashier account — try store employees.
  const employee = await prisma.employee.findFirst({ where: { login, active: true } });
  if (!employee || !employee.passwordHash) return invalid;
  if (!(await bcrypt.compare(password, employee.passwordHash))) return invalid;

  await createSession({
    userId: employee.id,
    employeeId: employee.id,
    storeId: employee.storeId,
    role: "EMPLOYEE",
  });
  return NextResponse.json({ ok: true });
}
