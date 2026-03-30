import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ScheduleEntryStatus, ScheduleEntryType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { notifyAffectedUsers } from "@/lib/schedule/module-engine";
import { createAuditLog } from "@/lib/services/audit-log-service";
import {
  ScheduleConflictError,
  cancelScheduleEntry,
  deleteScheduleEntry,
  updateManualScheduleEntry
} from "@/lib/services/schedule-module-service";

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
  isLocked: z.boolean().optional(),
  overrideConflicts: z.boolean().optional(),
  status: z.nativeEnum(ScheduleEntryStatus).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const session = await requireSession([Role.admin]);
  const { entryId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await updateManualScheduleEntry(entryId, parsed.data);
    if (parsed.data.status === ScheduleEntryStatus.cancelled) {
      await cancelScheduleEntry(entryId);
    }

    if (parsed.data.classId) {
      await notifyAffectedUsers({
        title: "Schedule updated",
        body: `${parsed.data.title} moved to a new slot.`,
        classId: parsed.data.classId,
        scheduleEntryId: updated.id
      });
    }

    await createAuditLog({
      eventType: "admin_action",
      action: "admin-schedule-entry-updated",
      status: "success",
      actorUserId: session.id,
      actorRole: session.role,
      entityType: "schedule-entry",
      entityId: updated.id,
      message: `Admin updated schedule entry ${updated.title}.`,
      metadata: parsed.data
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ entryId: string }> }) {
  await requireSession([Role.admin]);
  const { entryId } = await context.params;
  const deleted = await deleteScheduleEntry(entryId);
  return NextResponse.json({ deleted });
}
