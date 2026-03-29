import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export async function GET() {
  await requireSession([Role.admin]);
  const data = await getScheduleModuleData();
  return NextResponse.json({
    conflicts: data.conflicts,
    stats: data.stats
  });
}
