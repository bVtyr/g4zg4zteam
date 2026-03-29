import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { unlinkParentStudentLink } from "@/lib/services/parent-link-service";

export async function DELETE(_: Request, context: { params: Promise<{ linkId: string }> }) {
  try {
    const session = await requireSession([Role.parent]);
    const { linkId } = await context.params;

    return NextResponse.json(
      await unlinkParentStudentLink(linkId, {
        role: "parent",
        userId: session.id
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
        error: error instanceof Error ? error.message : "Не удалось отвязать ребенка."
      },
      { status: 400 }
    );
  }
}
