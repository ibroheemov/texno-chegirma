import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRangeSummary, resolvePeriodRange } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "today";
  const { start, end } = resolvePeriodRange(period, {
    date: searchParams.get("date"),
    month: searchParams.get("month"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });

  const summary = await getRangeSummary(session.storeId, start, end);

  return NextResponse.json({ range: { start, end }, ...summary });
}
