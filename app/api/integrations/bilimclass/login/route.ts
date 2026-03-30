import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { resolveBilimClassAcademicContext } from "@/lib/bilimclass/context";
import { loginBilimClass, saveBilimClassConnection } from "@/lib/bilimclass/service";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  mode: z.enum(["live", "mock"]).default("mock"),
  linkedStudentId: z.string().optional()
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireSession([Role.admin]);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const login = await loginBilimClass({
    username: parsed.data.username,
    password: parsed.data.password,
    mode: parsed.data.mode
  });
  const context = resolveBilimClassAcademicContext(login);
  const connection = parsed.data.linkedStudentId
    ? await saveBilimClassConnection({
        mode: parsed.data.mode,
        login: parsed.data.username,
        password: parsed.data.password,
        linkedStudentId: parsed.data.linkedStudentId,
        accessToken: login.access_token,
        refreshToken: login.refresh_token,
        bilimUserId: context.bilimUserId,
        schoolId: context.schoolId,
        eduYear: context.eduYear,
        groupId: context.groupId,
        groupName: context.groupName,
        studentFullName: context.studentFullName,
        externalRole: context.role
      })
    : null;

  return NextResponse.json(
    {
      ok: true,
      connection,
      context,
      login
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
