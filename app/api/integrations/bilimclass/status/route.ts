import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { getBilimClassStatus } from "@/lib/bilimclass/service";

export async function GET() {
  await requireSession([Role.admin]);
  return NextResponse.json(await getBilimClassStatus());
}
