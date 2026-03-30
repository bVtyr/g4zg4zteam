import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { AuditEventType, AuditStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { clearSession } from "@/lib/auth/session";
import { clearStudentBilimClassSession } from "@/lib/bilimclass/service";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog, getRequestClientInfo } from "@/lib/services/audit-log-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSessionUser();
  const clientInfo = getRequestClientInfo(request);

  if (session) {
    if (session.role === Role.student) {
      const student = await prisma.studentProfile.findUnique({
        where: {
          userId: session.id
        },
        select: {
          id: true
        }
      });

      if (student) {
        await clearStudentBilimClassSession(student.id).catch(() => null);
      }
    }

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
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Clear-Site-Data", "\"cache\"");
  clearSession(response);
  return response;
}
