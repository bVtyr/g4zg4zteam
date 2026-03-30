import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createAdminEvent } from "@/lib/services/portal-data";

const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(8).max(1200),
    type: z.enum(["news", "competition", "assembly", "celebration", "meeting"]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().trim().max(120).optional()
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "Event end must be after start.",
    path: ["endsAt"]
  });

export async function GET() {
  await requireSession([Role.admin]);
  return NextResponse.json(
    await prisma.event.findMany({
      orderBy: {
        startsAt: "asc"
      }
    })
  );
}

export async function POST(request: Request) {
  try {
    await requireSession([Role.admin]);
    const parsed = eventSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid event payload.");
    }

    return NextResponse.json(await createAdminEvent(parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden();
    }

    return serverError("Failed to create event.");
  }
}
