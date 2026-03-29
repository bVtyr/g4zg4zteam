import { NextResponse } from "next/server";
import { getStudentDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  return NextResponse.json(await getStudentDashboardData());
}
