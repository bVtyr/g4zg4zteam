import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditEventType, AuditStatus } from "@prisma/client";
import { authenticateUser } from "@/lib/services/auth-service";
import { issueSession } from "@/lib/auth/session";
import { roleLanding } from "@/lib/rbac/access";
import { badRequest, unauthorized } from "@/lib/auth/http";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog, getRequestClientInfo } from "@/lib/services/audit-log-service";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const clientInfo = getRequestClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid credentials payload");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      username: parsed.data.username
    },
    select: {
      id: true,
      role: true,
      fullName: true,
      isBlocked: true
    }
  });

  const user = await authenticateUser(parsed.data.username, parsed.data.password);
  if (!user) {
    await createAuditLog({
      eventType: AuditEventType.auth,
      action: existingUser?.isBlocked ? "login-blocked" : "login-failed",
      status: existingUser?.isBlocked ? AuditStatus.warning : AuditStatus.failed,
      actorUserId: existingUser?.id,
      actorRole: existingUser?.role,
      entityType: "session",
      message: existingUser?.isBlocked
        ? `Blocked login attempt for ${parsed.data.username}`
        : `Failed login attempt for ${parsed.data.username}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      metadata: {
        username: parsed.data.username
      }
    });
    return unauthorized("Invalid username or password");
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: clientInfo.ipAddress,
      lastUserAgent: clientInfo.userAgent
    }
  });

  await createAuditLog({
    eventType: AuditEventType.auth,
    action: "login-success",
    status: AuditStatus.success,
    actorUserId: user.id,
    actorRole: user.role,
    entityType: "session",
    message: `Successful login for ${user.fullName}`,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: roleLanding[user.role]
  });

  await issueSession(response, {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName
  });

  return response;
}
