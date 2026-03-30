import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { markDraftBatchExported } from "@/lib/schedule/draft-batch";
import { exportDraftBatchToExcel } from "@/lib/schedule/export-schedule-excel";
import { createAuditLog } from "@/lib/services/audit-log-service";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ batchId: string }>;
  }
) {
  const session = await requireSession([Role.admin]);
  const { batchId } = await context.params;
  const { buffer, fileName } = await exportDraftBatchToExcel(batchId);
  await markDraftBatchExported(batchId);

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-schedule-export-draft",
    status: "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "schedule-draft",
    entityId: batchId,
    message: `Admin exported draft ${batchId} to Excel.`
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
