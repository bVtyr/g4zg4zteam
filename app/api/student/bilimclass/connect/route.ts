import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { connectStudentBilimClass } from "@/lib/bilimclass/service";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const session = await requireSession([Role.student]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid BilimClass credentials payload");
    }

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

    const result = await connectStudentBilimClass(student.id, parsed.data);
    return NextResponse.json({
      ok: true,
      result
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
        error: error instanceof Error ? error.message : "BilimClass connection failed"
      },
      { status: 502 }
    );
  }
}
