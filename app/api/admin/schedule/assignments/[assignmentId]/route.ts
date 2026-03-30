import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  ScheduleResourceError,
  deleteTeachingAssignment,
  upsertTeachingAssignment
} from "@/lib/services/schedule-resource-service";

const schema = z.object({
  classId: z.string().min(1),
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
  roomId: z.string().nullable().optional(),
  weeklyLoad: z.number().int().min(1).max(50).optional(),
  subgroup: z.string().nullable().optional(),
  streamKey: z.string().nullable().optional()
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
        status: error.code === "ASSIGNMENT_DUPLICATE" ? 409 : 400
      }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return NextResponse.json(
      {
        error: "The selected class, subject, teacher, or room does not exist."
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: "Failed to update teaching assignment."
    },
    { status: 500 }
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> }
) {
  await requireSession([Role.admin]);
  const { assignmentId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const assignment = await upsertTeachingAssignment({
      id: assignmentId,
      ...parsed.data
    });
    return NextResponse.json({ assignment });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ assignmentId: string }> }
) {
  await requireSession([Role.admin]);
  const { assignmentId } = await context.params;
  const assignment = await deleteTeachingAssignment(assignmentId);
  return NextResponse.json({ assignment });
}
