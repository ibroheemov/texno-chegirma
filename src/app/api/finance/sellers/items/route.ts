import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSellerItemBreakdown } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const employeeIdParam = searchParams.get("employeeId");
  const employeeId = !employeeIdParam || employeeIdParam === "null" ? null : employeeIdParam;

  const data = await getSellerItemBreakdown(session.storeId, period, employeeId);
  return NextResponse.json(data);
}
