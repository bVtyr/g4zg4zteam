import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, RoomType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { upsertRoom } from "@/lib/services/schedule-module-service";

const schema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().min(1),
  type: z.nativeEnum(RoomType).optional(),
  suitableFor: z.string().nullable().optional(),
  allowEvents: z.boolean().optional(),
  isActive: z.boolean().optional(),
  prioritySubjects: z.string().nullable().optional()
});

export async function GET() {
  await requireSession([Role.admin]);
  const rooms = await prisma.room.findMany({
    orderBy: {
      name: "asc"
    }
  });
  return NextResponse.json({ rooms });
}

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const room = await upsertRoom(parsed.data);
  return NextResponse.json({ room });
}
