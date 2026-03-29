import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
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

  const result = await regenerateForTeacherAbsence(parsed.data);

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-schedule-recalculate",
    status: result.unresolvedEntries > 0 ? "warning" : "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "schedule",
    message: `Admin recalculated schedule for teacher absence: ${result.updatedEntries} entries, ${result.unresolvedEntries} unresolved.`,
    metadata: {
      input: parsed.data,
      result
    }
  });

  return NextResponse.json(result);
}
