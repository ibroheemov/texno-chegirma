import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dueDateFromYmd, parseDebtBody } from "@/lib/debtBook";

// Qarz daftari: create a debt entry.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role === "EMPLOYEE") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const parsed = parseDebtBody(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { dueDate, ...rest } = parsed.data;

  const entry = await prisma.debtEntry.create({
    data: { ...rest, storeId: session.storeId, dueDate: dueDateFromYmd(dueDate) },
  });
  return NextResponse.json({ id: entry.id }, { status: 201 });
}
