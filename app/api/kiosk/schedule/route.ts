import { NextResponse } from "next/server";
import { getScheduleDisplayData } from "@/lib/services/schedule-display-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const data = await getScheduleDisplayData({
    schoolYear: searchParams.get("schoolYear") ?? undefined,
    term: searchParams.get("term") ?? undefined,
    classId: searchParams.get("classId") || null,
    teacherId: searchParams.get("teacherId") || null,
    roomId: searchParams.get("roomId") || null,
    dayOfWeek: searchParams.get("dayOfWeek")
      ? Number(searchParams.get("dayOfWeek"))
      : null
  });

  return NextResponse.json(data);
}
