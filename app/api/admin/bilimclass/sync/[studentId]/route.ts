import { NextResponse } from "next/server";
import { AuditEventType, AuditStatus, Role } from "@prisma/client";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit-log-service";
import { syncStudentBilimClass } from "@/lib/bilimclass/service";

export const dynamic = "force-dynamic";

export async function POST(_: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await requireSession([Role.admin]);
    const { studentId } = await context.params;
    const result = await syncStudentBilimClass(studentId);

    await createAuditLog({
      eventType: AuditEventType.admin_action,
      action: "admin-bilimclass-sync",
      status: AuditStatus.success,
      actorUserId: session.id,
      actorRole: session.role,
      entityType: "student",
      entityId: studentId,
      message: `Admin triggered BilimClass sync for student ${studentId}`
    });

    return NextResponse.json(
      {
        ok: true,
        result
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden();
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось запустить синхронизацию BilimClass."
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
