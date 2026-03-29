import { AuditEventType, AuditStatus, ScoreType, type Prisma } from "@prisma/client";
import { MockBilimClassAdapter, LiveBilimClassAdapter, type BilimClassAdapter } from "@/lib/bilimclass/adapter";
import { decryptBilimClassSecret, encryptBilimClassSecret } from "@/lib/bilimclass/crypto";
import {
  mapBilimClassScoreType,
  normalizeBilimClassAttendance,
  normalizeBilimClassSubjectData,
  normalizeBilimClassYearData
} from "@/lib/bilimclass/normalizers";
import type {
  BilimClassLoginResponse,
  BilimClassPeriod,
  BilimClassSubjectDetail,
  BilimClassYearResponse
} from "@/lib/bilimclass/types";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log-service";

type ConnectionWithStudent = Prisma.BilimClassConnectionGetPayload<{
  include: {
    student: {
      include: {
        user: true;
      };
    };
  };
}>;

type ResolvedConnection = Omit<ConnectionWithStudent, "login" | "password" | "accessToken" | "refreshToken"> & {
  login: string | null;
  password: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const DEFAULT_BASE_URL = process.env.BILIMCLASS_BASE_URL ?? "https://api.bilimclass.kz";
const AUTO_SYNC_MINUTES = Number(process.env.BILIMCLASS_AUTO_SYNC_MINUTES ?? "360");

function mojibakeScore(value: string) {
  return (value.match(/[РСЃЋЌЎЄЇ]/g) ?? []).length;
}

function sanitizeBilimClassText(value?: string | null) {
  if (!value) {
    return value ?? "";
  }

  const repaired = Buffer.from(value, "latin1").toString("utf8");
  if (!repaired || repaired === value) {
    return value;
  }

  return mojibakeScore(repaired) + 2 < mojibakeScore(value) ? repaired : value;
}

function sanitizeYearResponse(response: BilimClassYearResponse): BilimClassYearResponse {
  return {
    data: {
      ...response.data,
      groupName: sanitizeBilimClassText(response.data.groupName),
      rows: response.data.rows.map((row) => ({
        ...row,
        subjectName: sanitizeBilimClassText(row.subjectName)
      }))
    }
  };
}

function sanitizeSubjectDetails(details: BilimClassSubjectDetail[]) {
  return details.map((item) => ({
    ...item,
    subjectName: sanitizeBilimClassText(item.subjectName)
  }));
}

function pickSchoolYear(
  values: Array<{
    schoolId: number;
    eduYear: number;
    isCurrent?: boolean;
  }>,
  preferredYear?: number
) {
  return (
    values.find((item) => item.eduYear === preferredYear) ??
    values.find((item) => item.isCurrent) ??
    values[0] ??
    null
  );
}

function resolveConnectionSecrets(connection: ConnectionWithStudent): ResolvedConnection {
  return {
    ...connection,
    login: decryptBilimClassSecret(connection.login),
    password: decryptBilimClassSecret(connection.password),
    accessToken: decryptBilimClassSecret(connection.accessToken),
    refreshToken: decryptBilimClassSecret(connection.refreshToken)
  };
}

async function getConnectionLatestLog(connectionId: string) {
  return prisma.bilimClassSyncLog.findFirst({
    where: {
      connectionId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function writeSyncLog(input: {
  connectionId: string;
  operation: string;
  status: "success" | "failed" | "partial";
  requestPayload?: unknown;
  responseSummary?: string;
  errorMessage?: string;
}) {
  return prisma.bilimClassSyncLog.create({
    data: {
      connectionId: input.connectionId,
      operation: input.operation,
      status: input.status,
      requestPayload: input.requestPayload ? JSON.stringify(input.requestPayload) : null,
      responseSummary: input.responseSummary ?? null,
      errorMessage: input.errorMessage ?? null
    }
  });
}

async function updateConnectionState(connectionId: string, input: {
  schoolId?: number;
  eduYear?: number;
  groupId?: number | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  lastStatus?: string;
  lastSyncedAt?: Date | null;
}) {
  return prisma.bilimClassConnection.update({
    where: { id: connectionId },
    data: {
      ...(input.schoolId !== undefined ? { schoolId: input.schoolId } : {}),
      ...(input.eduYear !== undefined ? { eduYear: input.eduYear } : {}),
      ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
      ...(input.accessToken !== undefined ? { accessToken: encryptBilimClassSecret(input.accessToken) } : {}),
      ...(input.refreshToken !== undefined ? { refreshToken: encryptBilimClassSecret(input.refreshToken) } : {}),
      ...(input.lastStatus !== undefined ? { lastStatus: input.lastStatus } : {}),
      ...(input.lastSyncedAt !== undefined ? { lastSyncedAt: input.lastSyncedAt } : {})
    }
  });
}

async function ensureSubjectIdMap(rows: BilimClassYearResponse["data"]["rows"]) {
  const names = [...new Set(rows.map((row) => sanitizeBilimClassText(row.subjectName)).filter(Boolean))];
  const existingSubjects = await prisma.subject.findMany({
    where: {
      name: {
        in: names
      }
    }
  });

  const subjectMap = new Map(existingSubjects.map((subject) => [subject.name.toLocaleLowerCase(), subject.id]));

  for (const row of rows) {
    const subjectName = sanitizeBilimClassText(row.subjectName);
    const key = subjectName.toLocaleLowerCase();

    if (subjectMap.has(key)) {
      continue;
    }

    const created = await prisma.subject.create({
      data: {
        name: subjectName,
        category: "bilimclass",
        creditType: mapBilimClassScoreType(row.scoreType)
      }
    });

    subjectMap.set(key, created.id);
  }

  return rows.reduce<Record<string, string>>((acc, row) => {
    const subjectName = sanitizeBilimClassText(row.subjectName);
    const subjectId = subjectMap.get(subjectName.toLocaleLowerCase());
    if (subjectId) {
      acc[subjectName] = subjectId;
    }
    return acc;
  }, {});
}

async function syncYearAndAttendance(connection: ResolvedConnection, yearResponse: BilimClassYearResponse) {
  if (!connection.student) {
    throw new Error("BilimClass connection is not linked to a student");
  }

  const subjectIdMap = await ensureSubjectIdMap(yearResponse.data.rows);
  const normalizedGrades = normalizeBilimClassYearData(
    yearResponse,
    connection.eduYear,
    subjectIdMap,
    connection.student.id
  ).filter((item) => item.rawScore !== null || item.scoreType === ScoreType.no_score);

  await prisma.gradeRecord.deleteMany({
    where: {
      studentId: connection.student.id,
      source: "bilimclass",
      schoolYear: connection.eduYear
    }
  });

  if (normalizedGrades.length) {
    await prisma.gradeRecord.createMany({
      data: normalizedGrades
    });
  }

  const syncedSubjectIds = [...new Set(Object.values(subjectIdMap))];
  if (syncedSubjectIds.length) {
    await prisma.attendanceRecord.deleteMany({
      where: {
        studentId: connection.student.id,
        schoolYear: connection.eduYear,
        subjectId: {
          in: syncedSubjectIds
        }
      }
    });
  }

  for (const row of yearResponse.data.rows) {
    const subjectId = subjectIdMap[sanitizeBilimClassText(row.subjectName)];
    if (!subjectId) {
      continue;
    }

    await prisma.attendanceRecord.create({
      data: {
        id: `${connection.student.id}-${subjectId}-${connection.eduYear}-${row.periodType}`,
        studentId: connection.student.id,
        subjectId,
        schoolYear: connection.eduYear,
        periodType: row.periodType === "halfyear" ? "halfyear" : "quarter",
        periodNumber: row.periodType === "halfyear" ? 2 : 4,
        recordedAt: new Date(),
        ...normalizeBilimClassAttendance(row.attendances)
      }
    });
  }

  return {
    groupName: yearResponse.data.groupName,
    groupId: yearResponse.data.groupId,
    rows: yearResponse.data.rows.length,
    gradesImported: normalizedGrades.length
  };
}

async function fetchSubjectSnapshots(
  adapter: BilimClassAdapter,
  connection: ResolvedConnection,
  periods: BilimClassPeriod[]
) {
  const periodPayload = periods.filter((item) => item.hasData && connection.groupId).slice(0, 6);
  const detailsByPeriod: Array<{
    period: number;
    periodType: "quarter" | "halfyear";
    title: string;
    subjectCount: number;
  }> = [];
  const errors: string[] = [];

  for (const period of periodPayload) {
    try {
      const rawDetails = await adapter.getSubjects({
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        period: period.period,
        periodType: period.periodType,
        groupId: connection.groupId!,
        token: connection.accessToken ?? undefined
      });

      const normalized = normalizeBilimClassSubjectData(sanitizeSubjectDetails(rawDetails));
      detailsByPeriod.push({
        period: period.period,
        periodType: period.periodType,
        title: sanitizeBilimClassText(period.title),
        subjectCount: normalized.length
      });
    } catch (error) {
      errors.push(`${period.periodType}-${period.period}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  return {
    detailsByPeriod,
    errors
  };
}

async function syncConnectionData(
  connection: ResolvedConnection,
  options?: {
    loginResponse?: BilimClassLoginResponse;
  }
) {
  if (!connection.student) {
    throw new Error("BilimClass connection is not linked to a student");
  }

  if (!connection.login || !connection.password) {
    throw new Error("BilimClass credentials are not configured");
  }

  const adapter = getBilimClassAdapter(connection.mode);
  const login =
    options?.loginResponse ??
    (await adapter.login({
      username: connection.login,
      password: connection.password
    }));

  const selectedYear = pickSchoolYear(login.user_info.school.eduYears as Array<{ schoolId: number; eduYear: number; isCurrent?: boolean }>, connection.eduYear);
  const schoolId = selectedYear?.schoolId ?? connection.schoolId;
  const eduYear = selectedYear?.eduYear ?? connection.eduYear;
  const groupId = login.user_info.group.id ?? connection.groupId ?? null;
  const updatedConnection = {
    ...connection,
    schoolId,
    eduYear,
    groupId,
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  };

  await updateConnectionState(connection.id, {
    schoolId,
    eduYear,
    groupId,
    accessToken: login.access_token,
    refreshToken: login.refresh_token,
    lastStatus: "syncing"
  });

  await prisma.studentProfile.update({
    where: {
      id: connection.student.id
    },
    data: {
      bilimClassGroupId: groupId ?? undefined,
      bilimClassStudentUuid: login.user_info.studentInfo.studentGroupUuid ?? undefined
    }
  });

  try {
    const periods = (
      await adapter.getPeriods({
        schoolId,
        eduYear,
        token: updatedConnection.accessToken ?? undefined
      })
    ).map((item) => ({
      ...item,
      title: sanitizeBilimClassText(item.title)
    }));

    const yearResponse = sanitizeYearResponse(
      await adapter.getYear({
        schoolId,
        eduYear,
        token: updatedConnection.accessToken ?? undefined
      })
    );

    const yearSummary = await syncYearAndAttendance(updatedConnection, yearResponse);
    const subjectSnapshots = groupId ? await fetchSubjectSnapshots(adapter, updatedConnection, periods) : { detailsByPeriod: [], errors: [] };
    const syncStatus = subjectSnapshots.errors.length ? "partial" : "success";
    const syncedAt = new Date();

    await updateConnectionState(connection.id, {
      schoolId,
      eduYear,
      groupId,
      accessToken: updatedConnection.accessToken,
      refreshToken: updatedConnection.refreshToken,
      lastStatus: syncStatus === "success" ? "student-sync-success" : "student-sync-partial",
      lastSyncedAt: syncedAt
    });

    await writeSyncLog({
      connectionId: connection.id,
      operation: "student-sync",
      status: syncStatus,
      requestPayload: {
        schoolId,
        eduYear,
        groupId
      },
      responseSummary: `Imported ${yearSummary.gradesImported} grades from ${yearSummary.rows} rows; fetched ${subjectSnapshots.detailsByPeriod.length} subject snapshots.`,
      errorMessage: subjectSnapshots.errors.length ? subjectSnapshots.errors.join(" | ") : undefined
    });

    await createAuditLog({
      eventType: AuditEventType.bilimclass,
      action: "bilimclass-sync",
      status: syncStatus === "success" ? AuditStatus.success : AuditStatus.warning,
      actorUserId: connection.student.user.id,
      actorRole: connection.student.user.role,
      targetUserId: connection.student.user.id,
      entityType: "bilimclass-connection",
      entityId: connection.id,
      message: `BilimClass sync ${syncStatus} for ${connection.student.user.fullName}`,
      metadata: {
        schoolId,
        eduYear,
        groupId,
        gradesImported: yearSummary.gradesImported,
        subjectSnapshots: subjectSnapshots.detailsByPeriod.length
      }
    });

    return {
      connectionId: connection.id,
      schoolId,
      eduYear,
      groupId,
      lastSyncedAt: syncedAt,
      periods,
      yearSummary,
      subjectSnapshots: subjectSnapshots.detailsByPeriod,
      status: syncStatus
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "BilimClass sync failed";
    await updateConnectionState(connection.id, {
      schoolId,
      eduYear,
      groupId,
      accessToken: updatedConnection.accessToken,
      refreshToken: updatedConnection.refreshToken,
      lastStatus: "student-sync-failed"
    });
    await writeSyncLog({
      connectionId: connection.id,
      operation: "student-sync",
      status: "failed",
      requestPayload: {
        schoolId,
        eduYear,
        groupId
      },
      errorMessage: message
    });
    await createAuditLog({
      eventType: AuditEventType.bilimclass,
      action: "bilimclass-sync-failed",
      status: AuditStatus.failed,
      actorUserId: connection.student.user.id,
      actorRole: connection.student.user.role,
      targetUserId: connection.student.user.id,
      entityType: "bilimclass-connection",
      entityId: connection.id,
      message: `BilimClass sync failed for ${connection.student.user.fullName}: ${message}`,
      metadata: {
        schoolId,
        eduYear,
        groupId
      }
    });
    throw new Error(message);
  }
}

export function getBilimClassAdapter(mode?: string): BilimClassAdapter {
  return mode === "live" ? new LiveBilimClassAdapter() : new MockBilimClassAdapter();
}

export async function getBilimClassConnection() {
  return prisma.bilimClassConnection.findFirst({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      student: {
        include: {
          user: true
        }
      }
    }
  });
}

export async function getBilimClassConnectionByStudent(studentId: string) {
  return prisma.bilimClassConnection.findFirst({
    where: {
      linkedStudentId: studentId
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      student: {
        include: {
          user: true
        }
      }
    }
  });
}

export async function loginBilimClass(credentials: { username: string; password: string; mode?: "live" | "mock" }) {
  const adapter = getBilimClassAdapter(credentials.mode ?? process.env.BILIMCLASS_MODE);
  return adapter.login(credentials);
}

export async function saveBilimClassConnection(input: {
  mode: "mock" | "live";
  login?: string;
  password?: string;
  schoolId: number;
  eduYear: number;
  groupId?: number;
  linkedStudentId?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  const existing = input.linkedStudentId ? await getBilimClassConnectionByStudent(input.linkedStudentId) : null;
  const data = {
    mode: input.mode,
    baseUrl: DEFAULT_BASE_URL,
    login: encryptBilimClassSecret(input.login),
    password: encryptBilimClassSecret(input.password),
    schoolId: input.schoolId,
    eduYear: input.eduYear,
    groupId: input.groupId,
    linkedStudentId: input.linkedStudentId,
    accessToken: encryptBilimClassSecret(input.accessToken),
    refreshToken: encryptBilimClassSecret(input.refreshToken),
    lastStatus: "configured"
  };

  return existing
    ? prisma.bilimClassConnection.update({
        where: { id: existing.id },
        data
      })
    : prisma.bilimClassConnection.create({
        data
      });
}

export async function connectStudentBilimClass(studentId: string, credentials: {
  username: string;
  password: string;
  mode?: "live" | "mock";
}) {
  const mode = credentials.mode ?? ((process.env.BILIMCLASS_MODE as "live" | "mock" | undefined) ?? "mock");
  const login = await loginBilimClass({
    username: credentials.username,
    password: credentials.password,
    mode
  });
  const selectedYear = pickSchoolYear(login.user_info.school.eduYears as Array<{ schoolId: number; eduYear: number; isCurrent?: boolean }>);
  const schoolId = selectedYear?.schoolId ?? 1013305;
  const eduYear = selectedYear?.eduYear ?? new Date().getFullYear();
  const groupId = login.user_info.group.id;

  const persisted = await saveBilimClassConnection({
    mode,
    login: credentials.username,
    password: credentials.password,
    schoolId,
    eduYear,
    groupId,
    linkedStudentId: studentId,
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  });

  await prisma.studentProfile.update({
    where: {
      id: studentId
    },
    data: {
      bilimClassGroupId: groupId,
      bilimClassStudentUuid: login.user_info.studentInfo.studentGroupUuid ?? undefined
    }
  });

  await writeSyncLog({
    connectionId: persisted.id,
    operation: "connect",
    status: "success",
    requestPayload: {
      mode,
      schoolId,
      eduYear,
      groupId
    },
    responseSummary: `BilimClass account connected for student ${studentId}.`
  });

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: {
      id: studentId
    },
    include: {
      user: true
    }
  });

  await createAuditLog({
    eventType: AuditEventType.bilimclass,
    action: "bilimclass-connected",
    status: AuditStatus.success,
    actorUserId: student.userId,
    actorRole: student.user.role,
    targetUserId: student.userId,
    entityType: "bilimclass-connection",
    entityId: persisted.id,
    message: `BilimClass connected for ${student.user.fullName}`,
    metadata: {
      mode,
      schoolId,
      eduYear,
      groupId
    }
  });

  const fullConnection = await prisma.bilimClassConnection.findUniqueOrThrow({
    where: { id: persisted.id },
    include: {
      student: {
        include: {
          user: true
        }
      }
    }
  });

  return syncConnectionData(resolveConnectionSecrets(fullConnection), {
    loginResponse: login
  });
}

export async function syncStudentBilimClass(studentId: string) {
  const connection = await getBilimClassConnectionByStudent(studentId);
  if (!connection) {
    throw new Error("BilimClass connection is not configured");
  }

  return syncConnectionData(resolveConnectionSecrets(connection));
}

export async function ensureStudentBilimClassFresh(studentId: string) {
  const connection = await getBilimClassConnectionByStudent(studentId);
  if (!connection) {
    return null;
  }

  const stale =
    !connection.lastSyncedAt ||
    Date.now() - new Date(connection.lastSyncedAt).getTime() > AUTO_SYNC_MINUTES * 60 * 1000;

  if (stale) {
    try {
      await syncConnectionData(resolveConnectionSecrets(connection));
    } catch {
      return getStudentBilimClassStatus(studentId);
    }
  }

  return getStudentBilimClassStatus(studentId);
}

export async function getStudentBilimClassStatus(studentId: string) {
  const connection = await getBilimClassConnectionByStudent(studentId);

  if (!connection) {
    return {
      connected: false,
      mode: (process.env.BILIMCLASS_MODE ?? "mock") as "mock" | "live"
    };
  }

  const latestLog = await getConnectionLatestLog(connection.id);

  return {
    connected: true,
    mode: connection.mode,
    schoolId: connection.schoolId,
    eduYear: connection.eduYear,
    groupId: connection.groupId,
    lastStatus: connection.lastStatus,
    lastSyncedAt: connection.lastSyncedAt,
    hasCredentials: Boolean(connection.login && connection.password),
    latestLog
  };
}

export async function syncBilimClassYear(connectionId?: string) {
  const connection =
    (connectionId
      ? await prisma.bilimClassConnection.findUnique({
          where: { id: connectionId },
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        })
      : await getBilimClassConnection()) ?? null;

  if (!connection || !connection.student) {
    throw new Error("BilimClass connection is not configured");
  }

  const result = await syncConnectionData(resolveConnectionSecrets(connection));

  return {
    connection,
    summary: result.yearSummary
  };
}

export async function syncBilimClassSubjects(params?: {
  connectionId?: string;
  period?: number;
  periodType?: "quarter" | "halfyear";
}) {
  const connection =
    (params?.connectionId
      ? await prisma.bilimClassConnection.findUnique({
          where: { id: params.connectionId },
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        })
      : await getBilimClassConnection()) ?? null;

  if (!connection) {
    throw new Error("BilimClass connection is not configured");
  }

  const resolved = resolveConnectionSecrets(connection);
  if (!resolved.login || !resolved.password) {
    throw new Error("BilimClass credentials are not configured");
  }

  const adapter = getBilimClassAdapter(resolved.mode);
  const login = await adapter.login({
    username: resolved.login,
    password: resolved.password
  });

  await updateConnectionState(resolved.id, {
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  });

  const period = params?.period ?? 3;
  const periodType = params?.periodType ?? "quarter";
  const groupId = login.user_info.group.id ?? resolved.groupId;
  if (!groupId) {
    throw new Error("BilimClass group is not configured");
  }

  const details = await adapter.getSubjects({
    schoolId: resolved.schoolId,
    eduYear: resolved.eduYear,
    period,
    periodType,
    groupId,
    token: login.access_token
  });

  const normalized = normalizeBilimClassSubjectData(sanitizeSubjectDetails(details));

  await writeSyncLog({
    connectionId: resolved.id,
    operation: "subject-sync",
    status: "success",
    requestPayload: { period, periodType },
    responseSummary: `Fetched ${normalized.length} subject detail rows for ${periodType}-${period}.`
  });

  return normalized;
}

export async function getBilimClassStatus() {
  const connection = await getBilimClassConnection();

  if (!connection) {
    return {
      connected: false,
      mode: process.env.BILIMCLASS_MODE ?? "mock"
    };
  }

  const latestLog = await getConnectionLatestLog(connection.id);

  return {
    connected: true,
    mode: connection.mode,
    schoolId: connection.schoolId,
    eduYear: connection.eduYear,
    groupId: connection.groupId,
    linkedStudentId: connection.linkedStudentId,
    lastStatus: connection.lastStatus,
    lastSyncedAt: connection.lastSyncedAt,
    latestLog
  };
}
