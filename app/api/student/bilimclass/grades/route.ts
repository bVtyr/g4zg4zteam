import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { getStudentBilimClassGradebookView } from "@/lib/bilimclass/gradebook";
import { prisma } from "@/lib/db/prisma";
import { getStudentDashboardData } from "@/lib/services/portal-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const locale = request.nextUrl.searchParams.get("locale") === "kz" ? "kz" : "ru";
    const tab = request.nextUrl.searchParams.get("tab") === "year" ? "year" : "grades";
    const periodKey = request.nextUrl.searchParams.get("periodKey");
    const dashboard = await getStudentDashboardData(student.id, locale);
    const view = await getStudentBilimClassGradebookView({
      studentId: student.id,
      locale,
      summaryRows: dashboard.bilimClass.gradebook,
      tab,
      periodKey
    });

    return NextResponse.json(view, {
      headers: {
        "Cache-Control": "no-store"
      }
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
        error: error instanceof Error ? error.message : "Failed to load gradebook"
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
