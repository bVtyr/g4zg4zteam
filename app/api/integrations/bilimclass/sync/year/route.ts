import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { syncBilimClassYear } from "@/lib/bilimclass/service";

const schema = z.object({
  connectionId: z.string().min(1)
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(await syncBilimClassYear(parsed.data.connectionId), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
