import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorized } from "@/lib/auth/http";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return unauthorized();
  }

  return NextResponse.json(session);
}
