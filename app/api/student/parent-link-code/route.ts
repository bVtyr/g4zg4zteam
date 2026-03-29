import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { generateParentLinkCode } from "@/lib/services/parent-link-service";

function errorMessage(error: string) {
  switch (error) {
    case "STUDENT_PARENT_LIMIT_REACHED":
      return "К ученику уже привязаны два родителя.";
    default:
      return "Не удалось сгенерировать код привязки.";
  }
}

export async function POST() {
  try {
    const session = await requireSession([Role.student]);
    const student = await prisma.studentProfile.findUnique({
      where: {
        userId: session.id
      },
      select: {
        id: true
      }
    });

    if (!student) {
      return forbidden("Student profile not found");
    }

    return NextResponse.json({
      ok: true,
      result: await generateParentLinkCode(student.id)
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden();
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? errorMessage(error.message) : "Не удалось сгенерировать код привязки."
      },
      { status: 400 }
    );
  }
}
