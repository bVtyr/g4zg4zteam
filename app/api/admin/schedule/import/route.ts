import fs from "node:fs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { importScheduleWorkbook } from "@/lib/schedule/excel-import";
import { createAuditLog } from "@/lib/services/audit-log-service";

const schema = z.object({
  filePath: z.string().min(1).optional(),
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  dryRun: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await requireSession([Role.admin]);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Excel file is required." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const schoolYear = String(formData.get("schoolYear") ?? "2025-2026");
    const term = String(formData.get("term") ?? "Q1");
    const dryRun = String(formData.get("dryRun") ?? "false") === "true";

    const result = await importScheduleWorkbook({
      fileBuffer,
      fileName: file.name,
      schoolYear,
      term,
      dryRun,
      actorUserId: session.id
    });

    await createAuditLog({
      eventType: "admin_action",
      action: "admin-schedule-import-upload",
      status: "success",
      actorUserId: session.id,
      actorRole: session.role,
      entityType: "schedule-import",
      message: `Schedule import executed for uploaded workbook ${file.name}`,
      metadata: {
        fileName: file.name,
        result
      }
    });

    return NextResponse.json(result);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.filePath) {
    return NextResponse.json({ error: "Excel file path not provided." }, { status: 400 });
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
