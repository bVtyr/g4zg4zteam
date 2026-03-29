import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { duplicateScheduleEntryToDays } from "@/lib/services/schedule-module-service";

const schema = z.object({
  dayOfWeeks: z.array(z.number().int().min(1).max(7)).min(1)
});

export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  await requireSession([Role.admin]);
  const { entryId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const duplicates = await duplicateScheduleEntryToDays(entryId, parsed.data.dayOfWeeks);
  return NextResponse.json({ duplicates });
}
