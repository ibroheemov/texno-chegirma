import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordSaleForDeliveredOrder, revertSaleForOrder } from "@/lib/orderSales";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const order = await prisma.onlineOrder.findFirst({ where: { id, storeId: session.storeId } });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const VALID_STATUSES = ["PENDING", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED", "FAILED"];
  const body = await req.json();

  const data: Prisma.OnlineOrderUncheckedUpdateInput = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Noto'g'ri status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.courierId !== undefined) {
    data.courierId = body.courierId || null;
  }

  const statusChanged = data.status !== undefined && data.status !== order.status;

  const updated = await prisma.$transaction(async (tx) => {
    if (statusChanged) {
      // Compare-and-set on the old status so a double click can't record the sale twice.
      const { count } = await tx.onlineOrder.updateMany({ where: { id, status: order.status }, data });
      if (count === 0) return null;

      if (data.status === "DELIVERED") {
        await recordSaleForDeliveredOrder(tx, order);
      } else if (order.status === "DELIVERED") {
        await revertSaleForOrder(tx, order);
      }
      return tx.onlineOrder.findUniqueOrThrow({ where: { id } });
    }
    return tx.onlineOrder.update({ where: { id }, data });
  });
  if (!updated) return NextResponse.json({ error: "Buyurtma holati allaqachon o'zgartirilgan" }, { status: 409 });

  return NextResponse.json({ order: updated });
}
