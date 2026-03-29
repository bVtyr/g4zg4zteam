import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { syncBilimClassYear } from "@/lib/bilimclass/service";

export async function POST() {
  await requireSession([Role.admin]);
  return NextResponse.json(await syncBilimClassYear());
}
