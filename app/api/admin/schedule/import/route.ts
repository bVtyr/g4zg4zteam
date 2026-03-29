import fs from "node:fs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { importScheduleWorkbook } from "@/lib/schedule/excel-import";
import { createAuditLog } from "@/lib/services/audit-log-service";

const schema = z.object({
  filePath: z.string().min(1),
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  dryRun: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!fs.existsSync(parsed.data.filePath)) {
    return NextResponse.json({ error: "Excel file not found." }, { status: 404 });
  }

  const result = await importScheduleWorkbook({
    ...parsed.data,
    actorUserId: session.id
  });

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-schedule-import",
    status: "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "schedule-import",
    message: `Schedule import executed for ${parsed.data.filePath}`,
    metadata: {
      input: parsed.data,
      result
    }
  });

  return NextResponse.json(result);
}
