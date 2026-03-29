import { NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/services/portal-data";

export async function GET() {
  return NextResponse.json(await getAdminDashboardData());
}
