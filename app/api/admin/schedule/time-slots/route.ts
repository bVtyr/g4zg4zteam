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

export async function GET() {
  await requireSession([Role.admin]);
  const timeSlots = await prisma.timeSlot.findMany({
    orderBy: {
      slotNumber: "asc"
    }
  });
  return NextResponse.json({ timeSlots });
}

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const timeSlot = await upsertTimeSlot(parsed.data);
  return NextResponse.json({ timeSlot });
}
