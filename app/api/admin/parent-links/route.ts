import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { createOrUpdateAdminParentLink } from "@/lib/services/admin-service";

const schema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  relation: z.string().min(2)
});

export async function POST(request: Request) {
  try {
    const session = await requireSession([Role.admin]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return NextResponse.json(await createOrUpdateAdminParentLink(session.id, parsed.data));
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
          error instanceof Error && error.message === "STUDENT_PARENT_LIMIT_REACHED"
            ? "У ученика уже привязаны два родителя."
            : error instanceof Error
              ? error.message
              : "Не удалось создать привязку."
      },
      { status: 400 }
    );
  }
}
