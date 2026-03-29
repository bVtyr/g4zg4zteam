import { NextResponse } from "next/server";
import { getParentDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  const data = await getParentDashboardData();
  return NextResponse.json(data.weeklySummary);
}
