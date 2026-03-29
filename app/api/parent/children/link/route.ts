import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { consumeParentLinkCode } from "@/lib/services/parent-link-service";

const schema = z.object({
  code: z.string().trim().min(4),
  relation: z.string().trim().min(2).max(40).optional()
});

function errorMessage(error: string) {
  switch (error) {
    case "LINK_CODE_INVALID":
      return "Код не найден.";
    case "LINK_CODE_EXPIRED":
      return "Срок действия кода истек.";
    case "LINK_CODE_USED":
      return "Код уже использован.";
    case "LINK_ALREADY_EXISTS":
      return "Этот ребенок уже привязан к вашему аккаунту.";
    case "STUDENT_PARENT_LIMIT_REACHED":
      return "У ученика уже привязаны два родителя.";
    default:
      return "Не удалось привязать ребенка.";
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession([Role.parent]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid payload");
    }

    const parent = await prisma.parentProfile.findUnique({
      where: {
        userId: session.id
      },
      select: {
        id: true
      }
    });

    if (!parent) {
      return forbidden("Parent profile not found");
    }

    return NextResponse.json({
      ok: true,
      result: await consumeParentLinkCode(parent.id, parsed.data.code, parsed.data.relation ?? "parent")
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
        error: error instanceof Error ? errorMessage(error.message) : "Не удалось привязать ребенка."
      },
      { status: 400 }
    );
  }
}
