import { NextResponse } from "next/server";
import { getTeacherDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  return NextResponse.json(await getTeacherDashboardData());
}
