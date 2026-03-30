import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { forbidden, unauthorized } from "@/lib/auth/http";
import { requireSession } from "@/lib/auth/session";
import { performAdminBulkAction } from "@/lib/services/admin-service";

const schema = z.object({
  action: z.enum(["block", "unblock", "sync-bilimclass"]),
  userIds: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  try {
    const session = await requireSession([Role.admin]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return NextResponse.json(await performAdminBulkAction(session.id, parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden();
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "CANNOT_BULK_UPDATE_SELF"
            ? "You cannot block or unblock your own admin account."
            : error instanceof Error && error.message === "CANNOT_BULK_UPDATE_ADMIN"
              ? "Bulk block or unblock is not allowed for admin accounts."
              : error instanceof Error
                ? error.message
                : "Failed to perform bulk action."
      },
      { status: 400 }
    );
  }
}
