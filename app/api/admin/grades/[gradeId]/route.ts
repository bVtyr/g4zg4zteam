import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { updateAdminGrade } from "@/lib/services/admin-service";

const schema = z.object({
  rawScore: z.string().nullable().optional(),
  normalizedScore: z.number().nullable().optional(),
  finalScore: z.number().nullable().optional(),
  isHidden: z.boolean().optional(),
  adminNote: z.string().nullable().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ gradeId: string }> }) {
  try {
    const session = await requireSession([Role.admin]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { gradeId } = await context.params;
    return NextResponse.json(
      await updateAdminGrade(session.id, {
        gradeId,
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
        error: error instanceof Error ? error.message : "Не удалось обновить оценку."
      },
      { status: 400 }
    );
  }
}
