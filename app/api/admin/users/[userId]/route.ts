import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { updateAdminUser } from "@/lib/services/admin-service";

const schema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  isBlocked: z.boolean().optional(),
  blockedReason: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  verifiedProfile: z.boolean().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireSession([Role.admin]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { userId } = await context.params;

    return NextResponse.json(
      await updateAdminUser(session.id, {
        userId,
        ...parsed.data
      })
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
        error:
          error instanceof Error && error.message === "STUDENT_CLASS_REQUIRED"
            ? "Для роли student требуется classId."
            : error instanceof Error
              ? error.message
              : "Не удалось обновить пользователя."
      },
      { status: 400 }
    );
  }
}
