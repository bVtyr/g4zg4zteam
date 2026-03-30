import type { SyncMode } from "@prisma/client";
import type { BilimClassLoginResponse } from "@/lib/bilimclass/types";

type SchoolYearInfo = {
  schoolId: number;
  eduYear: number;
  isCurrent?: boolean;
};

export type BilimClassAcademicContext = {
  bilimUserId: number;
  schoolId: number;
  eduYear: number;
  groupId: number | null;
  groupName: string | null;
  studentFullName: string | null;
  role: "student";
};

export type BilimClassScopeKeyInput = {
  localStudentId: string;
  localUserId?: string | null;
  bilimUserId?: number | null;
  schoolId?: number | null;
  eduYear?: number | null;
  groupId?: number | null;
  period?: number | null;
  periodType?: "quarter" | "halfyear" | "year" | null;
};

function mojibakeScore(value: string) {
  return (value.match(/[Р РЎРѓР‹РЊРЋР„Р‡]/g) ?? []).length;
}

export function sanitizeBilimClassText(value?: string | null) {
  if (!value) {
    return value ?? "";
  }

  const repaired = Buffer.from(value, "latin1").toString("utf8");
  if (!repaired || repaired === value) {
    return value;
  }

  return mojibakeScore(repaired) + 2 < mojibakeScore(value) ? repaired : value;
}

export function pickBilimClassSchoolYear(values: SchoolYearInfo[], preferredYear?: number) {
  return (
    values.find((item) => item.eduYear === preferredYear) ??
    values.find((item) => item.isCurrent) ??
    values[0] ??
    null
  );
}

export function resolveBilimClassAcademicContext(
  login: BilimClassLoginResponse,
  preferredYear?: number
): BilimClassAcademicContext {
  const selectedYear = pickBilimClassSchoolYear(login.user_info.school.eduYears, preferredYear);

  if (!selectedYear?.schoolId || !selectedYear.eduYear) {
    throw new Error("BilimClass did not return a valid school context");
  }

  return {
    bilimUserId: login.user_info.userId,
    schoolId: selectedYear.schoolId,
    eduYear: selectedYear.eduYear,
    groupId: login.user_info.group.id ?? null,
    groupName: sanitizeBilimClassText(login.user_info.group.name ?? null) || null,
    studentFullName: sanitizeBilimClassText(login.user_info.studentInfo.fullname ?? null) || null,
    role: "student"
  };
}

export function buildBilimClassScopeKey(input: BilimClassScopeKeyInput) {
  return [
    `local:${input.localUserId ?? "unknown"}`,
    `student:${input.localStudentId}`,
    `bilim:${input.bilimUserId ?? "unknown"}`,
    `school:${input.schoolId ?? "missing"}`,
    `group:${input.groupId ?? "missing"}`,
    `year:${input.eduYear ?? "missing"}`,
    `period:${input.periodType ?? "none"}:${input.period ?? "none"}`
  ].join("|");
}

export function maskBilimClassSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 4)}...${value.slice(-2)}`;
}

export function buildBilimClassDebugContext(input: {
  localStudentId: string;
  localUserId?: string | null;
  mode: SyncMode | "mock" | "live";
  bilimUserId?: number | null;
  schoolId?: number | null;
  eduYear?: number | null;
  groupId?: number | null;
  period?: number | null;
  periodType?: "quarter" | "halfyear" | "year" | null;
  source: "live" | "mock" | "snapshot" | "none";
  cacheKey: string;
}) {
  return {
    localUserId: input.localUserId ?? null,
    localStudentId: input.localStudentId,
    bilimUserId: input.bilimUserId ?? null,
    schoolId: input.schoolId ?? null,
    groupId: input.groupId ?? null,
    eduYear: input.eduYear ?? null,
    period: input.period ?? null,
    periodType: input.periodType ?? null,
    mode: input.mode,
    source: input.source,
    cacheKey: input.cacheKey
  };
}
