import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ScheduleEntryType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { upsertTemplateRequest } from "@/lib/services/schedule-module-service";

const schema = z.object({
  title: z.string().min(1),
  schoolYear: z.string().optional(),
  term: z.string().optional(),
  classId: z.string().nullable().optional(),
  classGroupId: z.string().nullable().optional(),
  teacherId: z.string().min(1),
  subjectId: z.string().nullable().optional(),
  preferredRoomId: z.string().nullable().optional(),
  type: z.nativeEnum(ScheduleEntryType).optional(),
  lessonsPerWeek: z.number().int().min(1).max(20).optional(),
  durationSlots: z.number().int().min(1).max(4).optional(),
  preferredDaysJson: z.string().nullable().optional(),
  preferredSlotsJson: z.string().nullable().optional(),
  isHeavy: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  notes: z.string().nullable().optional()
});

export async function GET() {
  await requireSession([Role.admin]);
  const templates = await prisma.scheduleTemplateRequest.findMany({
    include: {
      schoolClass: true,
      subject: true,
      teacher: {
        include: {
          user: true
        }
      },
      preferredRoom: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const template = await upsertTemplateRequest(parsed.data);
  return NextResponse.json({ template });
}
