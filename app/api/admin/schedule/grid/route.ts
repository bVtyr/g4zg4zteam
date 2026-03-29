import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";
import { WEEK_DAYS } from "@/lib/schedule/slot-templates";

export async function GET() {
  await requireSession([Role.admin]);
  const data = await getScheduleModuleData();

  return NextResponse.json({
    grid: WEEK_DAYS.map((dayOfWeek) => ({
      dayOfWeek,
      slots: data.timeSlots.map((slot) => ({
        slotNumber: slot.slotNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        entries: data.entries.filter(
          (entry) => entry.dayOfWeek === dayOfWeek && (entry.slotNumber ?? entry.slotIndex ?? 0) === slot.slotNumber
        )
      }))
    }))
  });
}
