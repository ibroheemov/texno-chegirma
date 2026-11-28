import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeColor } from "@/lib/customerSegments";

// New design -> Mijozlar -> Guruhlar va teglar.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return NextResponse.json({ error: "Nomini kiriting" }, { status: 400 });

  const exists = await prisma.customerTag.findFirst({ where: { storeId: session.storeId, name } });
  if (exists) return NextResponse.json({ error: "Bu nomdagi teg allaqachon mavjud" }, { status: 409 });

  const created = await prisma.customerTag.create({
    data: {
      storeId: session.storeId,
      name,
      color: normalizeColor(body.color),
    },
  });
  return NextResponse.json({ item: created }, { status: 201 });
}
