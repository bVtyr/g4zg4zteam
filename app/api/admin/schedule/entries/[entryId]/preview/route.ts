import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ScheduleEntryType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { previewScheduleEntryUpdate } from "@/lib/services/schedule-module-service";

const schema = z.object({
  title: z.string().min(1),
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  classId: z.string().nullable().optional(),
  classGroupId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(1).max(7),
  slotNumber: z.number().int().min(1).max(20),
  durationSlots: z.number().int().min(1).max(4).optional(),
  type: z.nativeEnum(ScheduleEntryType),
  notes: z.string().nullable().optional(),
  isLocked: z.boolean().optional()
});

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  await requireSession([Role.admin]);
  const { entryId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const preview = await previewScheduleEntryUpdate(entryId, parsed.data);
    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SLOT") {
      return NextResponse.json(
        { error: "Invalid slot placement." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    throw error;
  }
}
