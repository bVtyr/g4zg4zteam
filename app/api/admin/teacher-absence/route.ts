import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { regenerateForTeacherAbsence } from "@/lib/schedule/module-engine";
import { createAuditLog } from "@/lib/services/audit-log-service";

const schema = z.object({
  teacherId: z.string().min(1),
  affectedDate: z.string().min(1),
  reason: z.string().optional(),
  previewOnly: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.previewOnly) {
    const preview = await regenerateForTeacherAbsence({
      ...parsed.data,
      previewOnly: true
    });
    return NextResponse.json({ preview });
  }

  const absence = await prisma.teacherAbsence.create({
    data: {
      teacherId: parsed.data.teacherId,
      startsAt: new Date(parsed.data.affectedDate),
      endsAt: new Date(parsed.data.affectedDate),
      reason: parsed.data.reason ?? null
    }
  });

  const result = await regenerateForTeacherAbsence({
    ...parsed.data,
    absenceId: absence.id
  });

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-teacher-absence",
    status: result.unresolvedEntries > 0 ? "warning" : "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "teacher-absence",
    entityId: absence.id,
    message: `Teacher absence registered and reschedule executed for ${parsed.data.teacherId}.`,
    metadata: {
      input: parsed.data,
      result
    }
  });

  return NextResponse.json({
    absence,
    result
  });
}
