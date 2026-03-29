import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { syncBilimClassSubjects } from "@/lib/bilimclass/service";

const schema = z.object({
  period: z.number().int().default(3),
  periodType: z.enum(["quarter", "halfyear"]).default("quarter")
});

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(await syncBilimClassSubjects(parsed.data));
}
