import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { upsertTeacher } from "@/lib/services/schedule-module-service";

const schema = z.object({
  fullName: z.string().min(1),
  title: z.string().nullable().optional(),
  expertise: z.string().nullable().optional(),
  preferredRoomId: z.string().nullable().optional(),
  canSubstitute: z.boolean().optional(),
  isActive: z.boolean().optional(),
  availabilityNote: z.string().nullable().optional(),
  substituteWeight: z.number().int().min(0).max(100).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ teacherId: string }> }) {
  await requireSession([Role.admin]);
  const { teacherId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await upsertTeacher({
    id: teacherId,
    ...parsed.data
  });
  return NextResponse.json({ teacher });
}

export async function DELETE(_: Request, context: { params: Promise<{ teacherId: string }> }) {
  await requireSession([Role.admin]);
  const { teacherId } = await context.params;
  const teacher = await prisma.teacherProfile.update({
    where: {
      id: teacherId
    },
    data: {
      isActive: false
    }
  });
  return NextResponse.json({ teacher });
}
