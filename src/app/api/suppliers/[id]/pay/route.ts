import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPPLIER_PAYMENT_CATEGORY } from "@/lib/stats";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]/pay">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, storeId: session.storeId } });
  if (!supplier) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  const method = body.method === "CARD" ? "CARD" : "CASH";
  const payCurrency = body.currency === "usd" ? "usd" : "som";
  let amount = Math.max(0, Number(body.amount) || 0);
  if (amount <= 0) return NextResponse.json({ error: "Summani kiriting" }, { status: 400 });

  const unpaidReceipts = await prisma.goodsReceipt.findMany({
    where: { storeId: session.storeId, supplierId: id, paymentMethod: "CREDIT" },
    orderBy: { createdAt: "asc" },
  });

  if (payCurrency === "usd") {
    const payable = unpaidReceipts.filter((r) => r.currency === "usd" && (r.costUsd ?? 0) - r.paidUsd > 0);
    const totalDebtUsd = payable.reduce((sum, r) => sum + ((r.costUsd ?? 0) - r.paidUsd), 0);
    if (amount > totalDebtUsd) amount = totalDebtUsd;
    if (amount <= 0) return NextResponse.json({ error: "Dollar qarzi mavjud emas" }, { status: 400 });

    const somEquivalent = await prisma.$transaction(async (tx) => {
      let remainingUsd = amount;
      let somTotal = 0;
      for (const r of payable) {
        if (remainingUsd <= 0) break;
        const dueUsd = (r.costUsd ?? 0) - r.paidUsd;
        const payUsd = Math.min(dueUsd, remainingUsd);
        const rate = r.usdRate ?? 0;
        const paySom = Math.round(payUsd * rate);
        await tx.goodsReceipt.update({
          where: { id: r.id },
          data: { paidUsd: { increment: payUsd }, paidAmount: { increment: paySom } },
        });
        somTotal += paySom;
        remainingUsd -= payUsd;
      }

      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          direction: "OUT",
          amount: somTotal,
          method,
          category: SUPPLIER_PAYMENT_CATEGORY,
          note: `Ta'minotchiga to'lov: ${supplier.name} ($${amount.toFixed(2)})`,
        },
      });

      return somTotal;
    });

    return NextResponse.json({ ok: true, somEquivalent });
  }

  const payable = unpaidReceipts.filter((r) => r.currency !== "usd" && r.totalCost - r.paidAmount > 0);
  const totalDebt = payable.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0);
  if (amount > totalDebt) amount = totalDebt;
  if (amount <= 0) return NextResponse.json({ error: "Qarz mavjud emas" }, { status: 400 });

  const paidUsdAmount = Number(body.paidUsdAmount) > 0 ? Number(body.paidUsdAmount) : null;
  const paidUsdRate = Number(body.paidUsdRate) > 0 ? Number(body.paidUsdRate) : null;
  const note =
    paidUsdAmount && paidUsdRate
      ? `Ta'minotchiga to'lov: ${supplier.name} ($${paidUsdAmount.toFixed(2)} x ${paidUsdRate})`
      : `Ta'minotchiga to'lov: ${supplier.name}`;

  await prisma.$transaction(async (tx) => {
    let remaining = amount;
    for (const r of payable) {
      if (remaining <= 0) break;
      const due = r.totalCost - r.paidAmount;
      const pay = Math.min(due, remaining);
      await tx.goodsReceipt.update({ where: { id: r.id }, data: { paidAmount: { increment: pay } } });
      remaining -= pay;
    }

    await tx.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "OUT",
        amount,
        method,
        category: SUPPLIER_PAYMENT_CATEGORY,
        note,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
