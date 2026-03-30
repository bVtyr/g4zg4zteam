import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import {
  applyGeneratedScheduleBatch,
  DraftApplyConflictError,
  DraftApplyValidationError
} from "@/lib/schedule/apply-generated-schedule";
import { createAuditLog } from "@/lib/services/audit-log-service";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ batchId: string }>;
  }
) {
  const session = await requireSession([Role.admin]);
  const { batchId } = await context.params;

  try {
    const result = await applyGeneratedScheduleBatch({
      batchId,
      actorUserId: session.id
    });

    await createAuditLog({
      eventType: "admin_action",
      action: "admin-schedule-apply-draft",
      status: "success",
      actorUserId: session.id,
      actorRole: session.role,
      entityType: "schedule-draft",
      entityId: batchId,
      message: `Admin applied schedule draft ${batchId}.`,
      metadata: result
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DraftApplyConflictError) {
      await createAuditLog({
        eventType: "admin_action",
        action: "admin-schedule-apply-draft",
        status: "warning",
        actorUserId: session.id,
        actorRole: session.role,
        entityType: "schedule-draft",
        entityId: batchId,
        message: `Apply rejected for draft ${batchId} because of critical conflicts.`,
        metadata: {
          conflicts: error.conflicts
        }
      });

      return NextResponse.json(
        {
          error: error.message,
          conflicts: error.conflicts
        },
        { status: 409 }
      );
    }

    if (error instanceof DraftApplyValidationError) {
      await createAuditLog({
        eventType: "admin_action",
        action: "admin-schedule-apply-draft",
        status: "warning",
        actorUserId: session.id,
        actorRole: session.role,
        entityType: "schedule-draft",
        entityId: batchId,
        message: `Apply rejected for draft ${batchId} because weekly requirements are not met.`,
        metadata: {
          issues: error.issues
        }
      });

      return NextResponse.json(
        {
          error: error.message,
          issues: error.issues
        },
        { status: 409 }
      );
    }

    throw error;
  }
}
