import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { exportAdminDataset } from "@/lib/services/admin-service";

export async function GET(request: Request) {
  await requireSession([Role.admin]);
  const { searchParams } = new URL(request.url);
  const target = (searchParams.get("target") ?? "logs") as "users" | "logs" | "grades";
  const csv = await exportAdminDataset(target);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${target}-export.csv"`
    }
  });
}
