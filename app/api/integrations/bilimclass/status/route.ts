import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { getBilimClassStatus } from "@/lib/bilimclass/service";

const schema = z.object({
  connectionId: z.string().min(1)
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireSession([Role.admin]);
  const url = new URL(request.url);
  const parsed = schema.safeParse({
    connectionId: url.searchParams.get("connectionId")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(await getBilimClassStatus(parsed.data.connectionId), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
