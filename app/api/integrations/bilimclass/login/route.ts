import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { loginBilimClass, saveBilimClassConnection } from "@/lib/bilimclass/service";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  mode: z.enum(["live", "mock"]).default("mock"),
  schoolId: z.number().int().optional(),
  eduYear: z.number().int().optional(),
  groupId: z.number().int().optional(),
  linkedStudentId: z.string().optional()
});

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

  const eduYear = parsed.data.eduYear ?? login.user_info.school.eduYears[0]?.eduYear ?? 2025;
  const schoolId = parsed.data.schoolId ?? login.user_info.school.eduYears[0]?.schoolId ?? 1013305;
  const groupId = parsed.data.groupId ?? login.user_info.group.id;

  const connection = await saveBilimClassConnection({
    mode: parsed.data.mode,
    login: parsed.data.username,
    password: parsed.data.password,
    schoolId,
    eduYear,
    groupId,
    linkedStudentId: parsed.data.linkedStudentId,
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  });

  return NextResponse.json({
    ok: true,
    connection,
    login
  });
}
