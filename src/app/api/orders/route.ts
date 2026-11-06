import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay, endOfDay } from "@/lib/stats";

function periodRange(period: string) {
  const now = new Date();
  if (period === "today") return { gte: startOfDay(now), lte: endOfDay(now) };
  if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { gte: start, lte: endOfDay(now) };
  }
  if (period === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return { gte: start, lte: endOfDay(now) };
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const payment = searchParams.get("payment");
  const courierId = searchParams.get("courierId");
  const period = searchParams.get("period") ?? "all";

  const createdAt = periodRange(period);

  const periodOrders = await prisma.onlineOrder.findMany({
    where: { storeId: session.storeId, ...(createdAt ? { createdAt } : {}) },
    orderBy: { createdAt: "desc" },
    include: { courier: true },
  });

  const stats = {
    total: periodOrders.length,
    pending: periodOrders.filter((o) => o.status === "PENDING").length,
    outForDelivery: periodOrders.filter((o) => o.status === "OUT_FOR_DELIVERY").length,
    delivered: periodOrders.filter((o) => o.status === "DELIVERED").length,
    failed: periodOrders.filter((o) => o.status === "FAILED" || o.status === "CANCELED").length,
    awaitingDelivery: periodOrders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED").length,
  };

  const orders = periodOrders.filter((o) => {
    if (status && status !== "all" && o.status !== status) return false;
    if (payment && payment !== "all" && o.paymentMethod !== payment) return false;
    if (courierId && courierId !== "all" && o.courierId !== courierId) return false;
    return true;
  });

  return NextResponse.json({ orders, stats });
}
