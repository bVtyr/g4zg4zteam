import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createAdminNotification } from "@/lib/services/portal-data";

export async function GET() {
  await requireSession([Role.admin]);
  return NextResponse.json(
    await prisma.notification.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })
  );
}

export async function POST(request: Request) {
  return NextResponse.json(await createAdminNotification(await request.json()));
}
