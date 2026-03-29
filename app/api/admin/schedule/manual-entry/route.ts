import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ScheduleEntryType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { notifyAffectedUsers } from "@/lib/schedule/module-engine";
import { createAuditLog } from "@/lib/services/audit-log-service";
import { ScheduleConflictError, createManualScheduleEntry } from "@/lib/services/schedule-module-service";

const schema = z.object({
  title: z.string().min(1),
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  classId: z.string().optional(),
  classGroupId: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
  dayOfWeek: z.number().int().min(1).max(7),
  slotNumber: z.number().int().min(1).max(20).optional(),
  slotIndex: z.number().int().min(1).max(20).optional(),
  durationSlots: z.number().int().min(1).max(4).optional(),
  type: z.nativeEnum(ScheduleEntryType).default(ScheduleEntryType.lesson),
  notes: z.string().optional(),
  isLocked: z.boolean().optional(),
  overrideConflicts: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const entry = await createManualScheduleEntry({
      title: parsed.data.title,
      schoolYear: parsed.data.schoolYear,
      term: parsed.data.term,
      classId: parsed.data.classId,
      classGroupId: parsed.data.classGroupId,
      subjectId: parsed.data.subjectId,
      teacherId: parsed.data.teacherId,
      roomId: parsed.data.roomId,
      dayOfWeek: parsed.data.dayOfWeek,
      slotNumber: parsed.data.slotNumber ?? parsed.data.slotIndex ?? 1,
      durationSlots: parsed.data.durationSlots,
      type: parsed.data.type,
      notes: parsed.data.notes,
      isLocked: parsed.data.isLocked,
      overrideConflicts: parsed.data.overrideConflicts
    });

    if (parsed.data.classId) {
      await notifyAffectedUsers({
        title: "Manual schedule update",
        body: `${parsed.data.title} was added to the schedule.`,
        classId: parsed.data.classId
      });
    }

    await createAuditLog({
      eventType: "admin_action",
      action: "admin-schedule-manual-entry",
      status: "success",
      actorUserId: session.id,
      actorRole: session.role,
      entityType: "schedule-entry",
      entityId: entry.id,
      message: `Admin added schedule entry ${entry.title}`,
      metadata: parsed.data
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 });
    }

    if (error instanceof Error && error.message === "INVALID_SLOT") {
      return NextResponse.json({ error: "Invalid slot placement" }, { status: 400 });
    }

    throw error;
  }
}
