import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const couriers = await prisma.employee.findMany({
    where: { storeId: session.storeId, isCourier: true },
    orderBy: { name: "asc" },
    include: { deliveries: true },
  });

  const rows = couriers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    photoUrl: c.photoUrl,
    delivered: c.deliveries.filter((d) => d.status === "DELIVERED").length,
    pending: c.deliveries.filter((d) => d.status === "PENDING" || d.status === "CONFIRMED" || d.status === "OUT_FOR_DELIVERY").length,
    failed: c.deliveries.filter((d) => d.status === "FAILED" || d.status === "CANCELED").length,
  }));

  return NextResponse.json({ couriers: rows });
}
