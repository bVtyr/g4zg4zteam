import { NextResponse } from "next/server";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getKioskFeed } from "@/lib/services/portal-data";

export async function GET() {
  const locale = await getCurrentLocale();
  return NextResponse.json(await getKioskFeed(locale));
}
