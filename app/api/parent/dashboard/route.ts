import { NextResponse } from "next/server";
import { getParentDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  return NextResponse.json(await getParentDashboardData());
}
