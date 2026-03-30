import { NextResponse } from "next/server";
import { Prisma, Role, ScoreType } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  ScheduleResourceError,
  deleteSubject,
  upsertSubject
} from "@/lib/services/schedule-resource-service";

const schema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  creditType: z.nativeEnum(ScoreType).optional()
});

function getErrorResponse(error: unknown) {
  if (error instanceof ScheduleResourceError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      {
        status: error.code === "SUBJECT_IN_USE" ? 409 : 400
      }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      {
        error: "A subject with this name already exists."
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      error: "Failed to update subject."
    },
    { status: 500 }
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ subjectId: string }> }
) {
  await requireSession([Role.admin]);
  const { subjectId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const subject = await upsertSubject({
      id: subjectId,
      ...parsed.data
    });
    return NextResponse.json({ subject });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ subjectId: string }> }
) {
  await requireSession([Role.admin]);
  const { subjectId } = await context.params;

  try {
    const subject = await deleteSubject(subjectId);
    return NextResponse.json({ subject });
  } catch (error) {
    return getErrorResponse(error);
  }
}
