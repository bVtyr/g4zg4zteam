import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { generateInitialSchedule } from "@/lib/schedule/module-engine";
import { createAuditLog } from "@/lib/services/audit-log-service";

const schema = z.object({
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  dryRun: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await generateInitialSchedule({
    ...parsed.data,
    actorUserId: session.id
  });

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-schedule-generate",
    status: result.conflicts.length ? "warning" : "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "schedule",
    message: `Admin generated schedule: ${result.generated} entries, ${result.conflicts.length} conflicts.`,
    metadata: result
  });

  return NextResponse.json(result);
}
