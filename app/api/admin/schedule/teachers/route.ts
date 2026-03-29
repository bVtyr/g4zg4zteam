import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { upsertTeacher } from "@/lib/services/schedule-module-service";

const schema = z.object({
  fullName: z.string().min(1),
  username: z.string().optional(),
  title: z.string().nullable().optional(),
  expertise: z.string().nullable().optional(),
  preferredRoomId: z.string().nullable().optional(),
  canSubstitute: z.boolean().optional(),
  isActive: z.boolean().optional(),
  availabilityNote: z.string().nullable().optional(),
  substituteWeight: z.number().int().min(0).max(100).optional()
});

export async function GET() {
  await requireSession([Role.admin]);
  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: true,
      assignments: {
        include: {
          subject: true,
          schoolClass: true
        }
      },
      availabilities: true
    },
    orderBy: {
      user: {
        fullName: "asc"
      }
    }
  });

  return NextResponse.json({ teachers });
}

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await upsertTeacher(parsed.data);
  return NextResponse.json({ teacher });
}
