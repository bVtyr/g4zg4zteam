import { NextResponse } from "next/server";
import { getPortfolioForCurrentUser } from "@/lib/services/portal-data";

export async function GET() {
  return NextResponse.json(await getPortfolioForCurrentUser());
}
