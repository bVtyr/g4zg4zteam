import { NextResponse } from "next/server";
import { getTeacherDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  const data = await getTeacherDashboardData();
  return NextResponse.json(data.riskStudents);
}
