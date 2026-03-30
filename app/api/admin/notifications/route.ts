import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createAdminNotification } from "@/lib/services/portal-data";

const notificationSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(8).max(1000),
  scope: z.enum(["role", "class", "parallel", "school"]),
  targetRoles: z.array(z.enum(["student", "teacher", "parent", "admin"])).optional(),
  classIds: z.array(z.string().min(1)).optional(),
  parallel: z.string().trim().max(20).optional()
});

export async function GET() {
  await requireSession([Role.admin]);
  return NextResponse.json(
    await prisma.notification.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })
  );
}

export async function POST(request: Request) {
  try {
    await requireSession([Role.admin]);
    const parsed = notificationSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid notification payload.");
    }

    return NextResponse.json(await createAdminNotification(parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden();
    }

    return serverError("Failed to create notification.");
  }
}
