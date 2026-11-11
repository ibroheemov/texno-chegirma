import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettlements } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";

  const data = await getSettlements(session.storeId, period);
  return NextResponse.json(data);
}
