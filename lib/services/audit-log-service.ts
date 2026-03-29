import { AuditEventType, AuditStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export function getRequestClientInfo(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? null;
  const userAgent = request.headers.get("user-agent");

  return {
    ipAddress,
    userAgent
  };
}

export async function createAuditLog(input: {
  eventType: AuditEventType;
  action: string;
  status: AuditStatus;
  actorUserId?: string | null;
  actorRole?: Role | null;
  targetUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  message: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      eventType: input.eventType,
      action: input.action,
      status: input.status,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      targetUserId: input.targetUserId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      message: input.message,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null
    }
  });
}
