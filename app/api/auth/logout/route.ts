import { NextResponse } from "next/server";
import { AuditEventType, AuditStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { clearSession } from "@/lib/auth/session";
import { createAuditLog, getRequestClientInfo } from "@/lib/services/audit-log-service";

export async function POST(request: Request) {
  const session = await getSessionUser();
  const clientInfo = getRequestClientInfo(request);

  if (session) {
    await createAuditLog({
      eventType: AuditEventType.auth,
      action: "logout",
      status: AuditStatus.success,
      actorUserId: session.id,
      actorRole: session.role,
      entityType: "session",
      message: `Logout for ${session.fullName}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent
    });
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  clearSession(response);
  return response;
}
