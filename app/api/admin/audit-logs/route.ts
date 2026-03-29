import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  await requireSession([Role.admin]);
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("eventType") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const role = searchParams.get("role") ?? undefined;
  const query = searchParams.get("query") ?? undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  return NextResponse.json(
    await prisma.auditLog.findMany({
      where: {
        ...(eventType ? { eventType: eventType as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(role ? { actorRole: role as never } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {})
              }
            }
          : {}),
        ...(query
          ? {
              OR: [
                { action: { contains: query } },
                { message: { contains: query } },
                { ipAddress: { contains: query } }
              ]
            }
          : {})
      },
      include: {
        actorUser: true,
        targetUser: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 200
    })
  );
}
