import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SALARY_CATEGORY } from "@/lib/stats";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const amount = Math.round(Number(body.amount));
  const method = body.method === "CARD" ? "CARD" : "CASH";
  const note: string | null = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!(amount > 0)) return NextResponse.json({ error: "Summani kiriting" }, { status: 400 });

  const employee = await prisma.employee.findFirst({
    where: { id: String(body.employeeId ?? ""), storeId: session.storeId },
  });
  if (!employee) return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });

  const payment = await prisma.$transaction(async (tx) => {
    const entry = await tx.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "OUT",
        amount,
        method,
        category: SALARY_CATEGORY,
        note: `Oylik: ${employee.name}${note ? ` · ${note}` : ""}`,
      },
    });
    return tx.salaryPayment.create({
      data: {
        storeId: session.storeId,
        employeeId: employee.id,
        amount,
        method,
        note,
        ledgerEntryId: entry.id,
      },
    });
  });

  return NextResponse.json({ payment }, { status: 201 });
}
