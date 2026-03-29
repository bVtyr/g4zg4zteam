import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { upsertTimeSlot } from "@/lib/services/schedule-module-service";

const schema = z.object({
  slotNumber: z.number().int().min(1).max(20),
  label: z.string().nullable().optional(),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  isBreak: z.boolean().optional(),
  breakLabel: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ timeSlotId: string }> }) {
  await requireSession([Role.admin]);
  const { timeSlotId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const timeSlot = await upsertTimeSlot({
    id: timeSlotId,
    ...parsed.data
  });
  return NextResponse.json({ timeSlot });
}

export async function DELETE(_: Request, context: { params: Promise<{ timeSlotId: string }> }) {
  await requireSession([Role.admin]);
  const { timeSlotId } = await context.params;
  const timeSlot = await prisma.timeSlot.update({
    where: {
      id: timeSlotId
    },
    data: {
      isActive: false
    }
  });
  return NextResponse.json({ timeSlot });
}
