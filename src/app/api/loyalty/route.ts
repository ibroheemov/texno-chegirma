import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseTiers } from "@/lib/customerSegments";

// New design -> Mijozlar -> Sodiqlik dasturi settings.
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tiers = parseTiers(body.tiers);
  if (!tiers) return NextResponse.json({ error: "Darajalar noto‘g‘ri to‘ldirilgan" }, { status: 400 });
  const enabled = body.enabled !== false;

  const program = await prisma.loyaltyProgram.upsert({
    where: { storeId: session.storeId },
    create: { storeId: session.storeId, enabled, tiers },
    update: { enabled, tiers },
  });
  return NextResponse.json({ program });
}
