import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { generateScheduleDraftWorkflow } from "@/lib/schedule/generation-workflow";
import { createAuditLog } from "@/lib/services/audit-log-service";

const schema = z.object({
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  classIds: z.array(z.string()).optional(),
  activeDays: z.array(z.number().int().min(1).max(7)).optional(),
  maxLessonsPerDay: z.number().int().min(1).max(12).optional(),
  scheduleProfile: z.enum(["database", "default"]).optional(),
  respectManualLocked: z.boolean().optional(),
  autoApply: z.boolean().optional(),
  optimizationPreset: z.enum(["balanced", "teacher_friendly", "compact"]).optional(),
  advancedOptions: z
    .object({
      backtrackingLimit: z.number().int().min(100).max(100000).optional(),
      avoidLateSlotsForJuniors: z.boolean().optional(),
      preferRoomStability: z.boolean().optional(),
      allowSameSubjectMultipleTimesPerDay: z.boolean().optional()
    })
    .optional()
});

export async function POST(request: Request) {
  const session = await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workflow = await generateScheduleDraftWorkflow({
    ...parsed.data,
    actorUserId: session.id
  });

  await createAuditLog({
    eventType: "admin_action",
    action:
      workflow.applied || workflow.applyError
        ? "admin-schedule-generate-apply"
        : "admin-schedule-generate-draft",
    status:
      workflow.applyError || workflow.result.conflicts.length || workflow.result.unplaced.length
        ? "warning"
        : "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "schedule",
    entityId: workflow.batch.id,
    message: workflow.applied
      ? `Admin generated and applied draft ${workflow.batch.id}.`
      : workflow.applyError
        ? `Admin generated draft ${workflow.batch.id}, but apply was rejected.`
        : `Admin generated draft ${workflow.batch.id}.`,
    metadata: workflow
  });

  return NextResponse.json(workflow);
}
