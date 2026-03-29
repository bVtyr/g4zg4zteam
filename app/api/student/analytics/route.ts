import { NextResponse } from "next/server";
import { getStudentDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  const data = await getStudentDashboardData();
  return NextResponse.json({
    grades: data.grades,
    attendance: data.attendance,
    weeklySummary: data.weeklySummary
  });
}
