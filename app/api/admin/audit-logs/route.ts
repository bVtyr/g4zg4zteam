import { NextResponse } from "next/server";
import { AuditEventType, AuditStatus, Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  await requireSession([Role.admin]);
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("eventType");
  const status = searchParams.get("status");
  const role = searchParams.get("role");
  const query = searchParams.get("query")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const takeValue = Number(searchParams.get("take") ?? "200");
  const take = Number.isFinite(takeValue) ? Math.min(Math.max(Math.trunc(takeValue), 1), 500) : 200;
  const eventTypeFilter =
    eventType && Object.values(AuditEventType).includes(eventType as AuditEventType)
      ? (eventType as AuditEventType)
      : undefined;
  const statusFilter =
    status && Object.values(AuditStatus).includes(status as AuditStatus) ? (status as AuditStatus) : undefined;
  const roleFilter =
    role && Object.values(Role).includes(role as Role) ? (role as Role) : undefined;
  const fromDate = dateFrom ? new Date(dateFrom) : undefined;
  const toDate = dateTo ? new Date(dateTo) : undefined;

  if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
    return NextResponse.json({ error: "Invalid date filter." }, { status: 400 });
  }

  return NextResponse.json(
    await prisma.auditLog.findMany({
      where: {
        ...(eventTypeFilter ? { eventType: eventTypeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(roleFilter ? { actorRole: roleFilter } : {}),
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {})
              }
            }
          : {}),
        ...(query
          ? {
              OR: [
                { action: { contains: query, mode: "insensitive" } },
                { message: { contains: query, mode: "insensitive" } },
                { ipAddress: { contains: query, mode: "insensitive" } },
                { entityType: { contains: query, mode: "insensitive" } }
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
      take
    })
  );
}
