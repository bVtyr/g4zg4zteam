import { NextResponse } from "next/server";
import { Role, AuditEventType, AuditStatus } from "@prisma/client";
import { z } from "zod";
import { badRequest } from "@/lib/auth/http";
import { issueSession } from "@/lib/auth/session";
import { roleLanding } from "@/lib/rbac/access";
import { registerUser } from "@/lib/services/auth-service";
import { createAuditLog, getRequestClientInfo } from "@/lib/services/audit-log-service";

const schema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
    password: z.string().min(8).max(128),
    email: z.string().trim().email().optional().or(z.literal("")),
    role: z.enum([Role.student, Role.teacher, Role.parent]),
    classId: z.string().trim().optional().or(z.literal(""))
  })
  .superRefine((value, ctx) => {
    if (value.role === Role.student && !value.classId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classId"],
        message: "Student class is required"
      });
    }
  });

export async function POST(request: Request) {
  const clientInfo = getRequestClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid registration payload");
  }

  try {
    const user = await registerUser({
      fullName: parsed.data.fullName,
      username: parsed.data.username,
      password: parsed.data.password,
      email: parsed.data.email || null,
      role: parsed.data.role,
      classId: parsed.data.classId || null
    });

    await createAuditLog({
      eventType: AuditEventType.auth,
      action: "register-success",
      status: AuditStatus.success,
      actorUserId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
      entityType: "user",
      entityId: user.id,
      message: `Successful registration for ${user.fullName}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      metadata: {
        username: user.username,
        role: user.role
      }
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
  } catch (error) {
    const message =
      error instanceof Error && ["USERNAME_TAKEN", "EMAIL_TAKEN", "CLASS_REQUIRED"].includes(error.message)
        ? error.message
        : "REGISTRATION_FAILED";

    await createAuditLog({
      eventType: AuditEventType.auth,
      action: "register-failed",
      status: AuditStatus.failed,
      entityType: "user",
      message: `Failed registration attempt for ${parsed.data.username}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      metadata: {
        username: parsed.data.username,
        role: parsed.data.role,
        error: message
      }
    });

    const status = message === "REGISTRATION_FAILED" ? 500 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
