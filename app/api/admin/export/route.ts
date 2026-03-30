import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { exportAdminDataset } from "@/lib/services/admin-service";

const targetSchema = z.enum(["users", "logs", "grades"]);

export async function GET(request: Request) {
  await requireSession([Role.admin]);
  const { searchParams } = new URL(request.url);
  const parsed = targetSchema.safeParse(searchParams.get("target") ?? "logs");

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export target." }, { status: 400 });
  }

  const target = parsed.data;
  const csv = await exportAdminDataset(target);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${target}-export.csv"`
    }
  });
}
