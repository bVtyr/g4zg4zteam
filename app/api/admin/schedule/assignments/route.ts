import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  ScheduleResourceError,
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
      error: "Failed to save teaching assignment."
    },
    { status: 500 }
  );
}

export async function GET() {
  await requireSession([Role.admin]);
  const assignments = await prisma.teachingAssignment.findMany({
    include: {
      schoolClass: true,
      subject: true,
      teacher: {
        include: {
          user: true
        }
      },
      room: true
    },
    orderBy: [
      { schoolClass: { gradeLevel: "asc" } },
      { schoolClass: { name: "asc" } },
      { subject: { name: "asc" } }
    ]
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const assignment = await upsertTeachingAssignment(parsed.data);
    return NextResponse.json({ assignment });
  } catch (error) {
    return getErrorResponse(error);
  }
}
