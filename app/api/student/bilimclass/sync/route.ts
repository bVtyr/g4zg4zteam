import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { syncStudentBilimClass } from "@/lib/bilimclass/service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

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

    return NextResponse.json(
      {
        ok: true,
        result: await syncStudentBilimClass(student.id)
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
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
        error: error instanceof Error ? error.message : "BilimClass sync failed"
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
