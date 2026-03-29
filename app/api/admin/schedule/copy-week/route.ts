import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { copyWeekTemplate } from "@/lib/services/schedule-module-service";

const schema = z.object({
  sourceClassId: z.string().min(1),
  targetClassId: z.string().min(1),
  schoolYear: z.string().optional(),
  term: z.string().optional()
});

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const copied = await copyWeekTemplate(parsed.data);
  return NextResponse.json({ copied });
}
