import { NextResponse } from "next/server";
import { Prisma, Role, ScoreType } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  ScheduleResourceError,
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
      error: "Failed to save subject."
    },
    { status: 500 }
  );
}

export async function GET() {
  await requireSession([Role.admin]);
  const subjects = await prisma.subject.findMany({
    orderBy: {
      name: "asc"
    }
  });

  return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const subject = await upsertSubject(parsed.data);
    return NextResponse.json({ subject });
  } catch (error) {
    return getErrorResponse(error);
  }
}
