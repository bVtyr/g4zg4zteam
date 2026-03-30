import { AuditEventType, AuditStatus, ScoreType, type Prisma } from "@prisma/client";
import { MockBilimClassAdapter, LiveBilimClassAdapter, type BilimClassAdapter } from "@/lib/bilimclass/adapter";
import { resolveBilimClassAcademicContext, buildBilimClassDebugContext, buildBilimClassScopeKey, maskBilimClassSecret, sanitizeBilimClassText } from "@/lib/bilimclass/context";
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

type StudentBoundConnection = Pick<
  ResolvedConnection,
  "student" | "bilimUserId" | "schoolId" | "eduYear" | "groupId" | "mode"
> & {
  student: NonNullable<ResolvedConnection["student"]>;
};

const DEFAULT_BASE_URL = process.env.BILIMCLASS_BASE_URL ?? "https://api.bilimclass.kz";
const DEFAULT_MODE = (process.env.BILIMCLASS_MODE ?? "mock") as "live" | "mock";
const AUTO_SYNC_MINUTES = Number(process.env.BILIMCLASS_AUTO_SYNC_MINUTES ?? "360");

function logBilimClass(level: "info" | "warn" | "error", event: string, payload: Record<string, unknown>) {
  const message = `[bilimclass] ${event}`;
  if (level === "error") {
    console.error(message, payload);
    return;
  }

  if (level === "warn") {
    console.warn(message, payload);
    return;
  }

  console.info(message, payload);
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

function assertStudentConnection(connection: ConnectionWithStudent | ResolvedConnection | null): asserts connection is ConnectionWithStudent | ResolvedConnection {
  if (!connection?.student) {
    throw new Error("BilimClass connection is not linked to a student");
  }
}

function buildConnectionScope(
  connection: StudentBoundConnection,
  extra?: { period?: number | null; periodType?: "quarter" | "halfyear" | "year" | null }
) {
  const cacheKey = buildBilimClassScopeKey({
    localStudentId: connection.student.id,
    localUserId: connection.student.user.id,
    bilimUserId: connection.bilimUserId,
    schoolId: connection.schoolId,
    eduYear: connection.eduYear,
    groupId: connection.groupId,
    period: extra?.period,
    periodType: extra?.periodType
  });

  return buildBilimClassDebugContext({
    localStudentId: connection.student.id,
    localUserId: connection.student.user.id,
    bilimUserId: connection.bilimUserId,
    schoolId: connection.schoolId,
    eduYear: connection.eduYear,
    groupId: connection.groupId,
    period: extra?.period,
    periodType: extra?.periodType,
    mode: connection.mode,
    source: connection.mode === "live" ? "live" : "mock",
    cacheKey
  });
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
  bilimUserId?: number | null;
  schoolId?: number;
  eduYear?: number;
  groupId?: number | null;
  groupName?: string | null;
  studentFullName?: string | null;
  externalRole?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  lastStatus?: string;
  lastSyncedAt?: Date | null;
}) {
  return prisma.bilimClassConnection.update({
    where: { id: connectionId },
    data: {
      ...(input.bilimUserId !== undefined ? { bilimUserId: input.bilimUserId } : {}),
      ...(input.schoolId !== undefined ? { schoolId: input.schoolId } : {}),
      ...(input.eduYear !== undefined ? { eduYear: input.eduYear } : {}),
      ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
      ...(input.groupName !== undefined ? { groupName: input.groupName } : {}),
      ...(input.studentFullName !== undefined ? { studentFullName: input.studentFullName } : {}),
      ...(input.externalRole !== undefined ? { externalRole: input.externalRole } : {}),
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
  assertStudentConnection(connection);
  const student = connection.student!;

  const subjectIdMap = await ensureSubjectIdMap(yearResponse.data.rows);
  const normalizedGrades = normalizeBilimClassYearData(
    yearResponse,
    connection.eduYear,
    subjectIdMap,
    student.id
  ).filter((item) => item.rawScore !== null || item.scoreType === ScoreType.no_score);

  await prisma.gradeRecord.deleteMany({
    where: {
      studentId: student.id,
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
        studentId: student.id,
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
        id: `${student.id}-${subjectId}-${connection.eduYear}-${row.periodType}`,
        studentId: student.id,
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
      const cacheKey = buildBilimClassScopeKey({
        localStudentId: connection.student?.id ?? "unknown",
        localUserId: connection.student?.user.id,
        bilimUserId: connection.bilimUserId,
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        groupId: connection.groupId,
        period: period.period,
        periodType: period.periodType
      });

      logBilimClass("info", "subjects-fetch", buildBilimClassDebugContext({
        localStudentId: connection.student?.id ?? "unknown",
        localUserId: connection.student?.user.id,
        bilimUserId: connection.bilimUserId,
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        groupId: connection.groupId,
        period: period.period,
        periodType: period.periodType,
        mode: connection.mode,
        source: connection.mode === "live" ? "live" : "mock",
        cacheKey
      }));

      const rawDetails = await adapter.getSubjects({
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        period: period.period,
        periodType: period.periodType,
        groupId: connection.groupId!,
        token: connection.accessToken ?? undefined
      });

      const normalized = normalizeBilimClassSubjectData(rawDetails.map((item) => ({
        ...item,
        subjectName: sanitizeBilimClassText(item.subjectName)
      })));
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
  assertStudentConnection(connection);
  const student = connection.student!;

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

  const academicContext = resolveBilimClassAcademicContext(login, connection.eduYear);
  const updatedConnection: ResolvedConnection = {
    ...connection,
    bilimUserId: academicContext.bilimUserId,
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    groupId: academicContext.groupId,
    groupName: academicContext.groupName,
    studentFullName: academicContext.studentFullName,
    externalRole: academicContext.role,
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  };
  const scopedConnection: StudentBoundConnection = {
    ...updatedConnection,
    student
  };

  const scope = buildConnectionScope(scopedConnection);
  logBilimClass("info", "sync-start", {
    ...scope,
    loginPreview: maskBilimClassSecret(connection.login),
    accessTokenPreview: maskBilimClassSecret(login.access_token),
    refreshTokenPreview: maskBilimClassSecret(login.refresh_token)
  });

  await updateConnectionState(connection.id, {
    bilimUserId: academicContext.bilimUserId,
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    groupId: academicContext.groupId,
    groupName: academicContext.groupName,
    studentFullName: academicContext.studentFullName,
    externalRole: academicContext.role,
    accessToken: login.access_token,
    refreshToken: login.refresh_token,
    lastStatus: "syncing"
  });

  await prisma.studentProfile.update({
    where: {
      id: student.id
    },
    data: {
      bilimClassGroupId: academicContext.groupId ?? undefined,
      bilimClassStudentUuid: login.user_info.studentInfo.studentGroupUuid ?? undefined
    }
  });

  try {
    const periods = (
      await adapter.getPeriods({
        schoolId: academicContext.schoolId,
        eduYear: academicContext.eduYear,
        token: login.access_token
      })
    ).map((item) => ({
      ...item,
      title: sanitizeBilimClassText(item.title)
    }));

    const rawYearResponse = await adapter.getYear({
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      token: login.access_token
    });
    const yearResponse = {
      data: {
        ...rawYearResponse.data,
        groupId: academicContext.groupId ?? rawYearResponse.data.groupId,
        groupName: academicContext.groupName ?? sanitizeBilimClassText(rawYearResponse.data.groupName),
        rows: rawYearResponse.data.rows.map((row) => ({
          ...row,
          subjectName: sanitizeBilimClassText(row.subjectName)
        }))
      }
    } satisfies BilimClassYearResponse;

    const yearSummary = await syncYearAndAttendance(updatedConnection, yearResponse);
    const subjectSnapshots = academicContext.groupId
      ? await fetchSubjectSnapshots(adapter, updatedConnection, periods)
      : { detailsByPeriod: [], errors: ["group-context-missing"] };
    const syncStatus = subjectSnapshots.errors.length ? "partial" : "success";
    const syncedAt = new Date();

    await updateConnectionState(connection.id, {
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      groupName: academicContext.groupName,
      studentFullName: academicContext.studentFullName,
      externalRole: academicContext.role,
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      lastStatus: syncStatus === "success" ? "student-sync-success" : "student-sync-partial",
      lastSyncedAt: syncedAt
    });

    await writeSyncLog({
      connectionId: connection.id,
      operation: "student-sync",
      status: syncStatus,
      requestPayload: scope,
      responseSummary: `Imported ${yearSummary.gradesImported} grades from ${yearSummary.rows} rows; fetched ${subjectSnapshots.detailsByPeriod.length} subject snapshots.`,
      errorMessage: subjectSnapshots.errors.length ? subjectSnapshots.errors.join(" | ") : undefined
    });

    await createAuditLog({
      eventType: AuditEventType.bilimclass,
      action: "bilimclass-sync",
      status: syncStatus === "success" ? AuditStatus.success : AuditStatus.warning,
      actorUserId: student.user.id,
      actorRole: student.user.role,
      targetUserId: student.user.id,
      entityType: "bilimclass-connection",
      entityId: connection.id,
      message: `BilimClass sync ${syncStatus} for ${student.user.fullName}`,
      metadata: {
        ...scope,
        gradesImported: yearSummary.gradesImported,
        subjectSnapshots: subjectSnapshots.detailsByPeriod.length
      }
    });

    logBilimClass(syncStatus === "success" ? "info" : "warn", "sync-finished", {
      ...scope,
      gradesImported: yearSummary.gradesImported,
      subjectSnapshots: subjectSnapshots.detailsByPeriod.length,
      status: syncStatus
    });

    return {
      connectionId: connection.id,
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      groupName: academicContext.groupName,
      studentFullName: academicContext.studentFullName,
      lastSyncedAt: syncedAt,
      periods,
      yearSummary,
      subjectSnapshots: subjectSnapshots.detailsByPeriod,
      status: syncStatus,
      cacheKey: scope.cacheKey
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "BilimClass sync failed";

    await updateConnectionState(connection.id, {
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      groupName: academicContext.groupName,
      studentFullName: academicContext.studentFullName,
      externalRole: academicContext.role,
      accessToken: login.access_token,
      refreshToken: login.refresh_token,
      lastStatus: "student-sync-failed"
    });
    await writeSyncLog({
      connectionId: connection.id,
      operation: "student-sync",
      status: "failed",
      requestPayload: scope,
      errorMessage: message
    });
    await createAuditLog({
      eventType: AuditEventType.bilimclass,
      action: "bilimclass-sync-failed",
      status: AuditStatus.failed,
      actorUserId: student.user.id,
      actorRole: student.user.role,
      targetUserId: student.user.id,
      entityType: "bilimclass-connection",
      entityId: connection.id,
      message: `BilimClass sync failed for ${student.user.fullName}: ${message}`,
      metadata: scope
    });

    logBilimClass("error", "sync-failed", {
      ...scope,
      error: message
    });

    throw new Error(message);
  }
}

export function getBilimClassAdapter(mode?: string): BilimClassAdapter {
  return mode === "live" ? new LiveBilimClassAdapter() : new MockBilimClassAdapter();
}

export async function getBilimClassConnectionById(connectionId: string) {
  return prisma.bilimClassConnection.findUnique({
    where: {
      id: connectionId
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
  const adapter = getBilimClassAdapter(credentials.mode ?? DEFAULT_MODE);
  return adapter.login(credentials);
}

export async function saveBilimClassConnection(input: {
  mode: "mock" | "live";
  login?: string;
  password?: string;
  linkedStudentId?: string;
  accessToken?: string;
  refreshToken?: string;
  bilimUserId?: number | null;
  schoolId: number;
  eduYear: number;
  groupId?: number | null;
  groupName?: string | null;
  studentFullName?: string | null;
  externalRole?: string | null;
}) {
  const existingConnections = input.linkedStudentId
    ? await prisma.bilimClassConnection.findMany({
        where: {
          linkedStudentId: input.linkedStudentId
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    : [];

  const primaryExisting = existingConnections[0] ?? null;
  const duplicateIds = existingConnections.slice(1).map((item) => item.id);
  if (duplicateIds.length) {
    await prisma.bilimClassConnection.deleteMany({
      where: {
        id: {
          in: duplicateIds
        }
      }
    });
  }

  const data = {
    mode: input.mode,
    baseUrl: DEFAULT_BASE_URL,
    login: encryptBilimClassSecret(input.login),
    password: encryptBilimClassSecret(input.password),
    linkedStudentId: input.linkedStudentId,
    accessToken: encryptBilimClassSecret(input.accessToken),
    refreshToken: encryptBilimClassSecret(input.refreshToken),
    bilimUserId: input.bilimUserId ?? null,
    schoolId: input.schoolId,
    eduYear: input.eduYear,
    groupId: input.groupId ?? null,
    groupName: input.groupName ?? null,
    studentFullName: input.studentFullName ?? null,
    externalRole: input.externalRole ?? "student",
    lastStatus: "configured"
  };

  return primaryExisting
    ? prisma.bilimClassConnection.update({
        where: { id: primaryExisting.id },
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
  const mode = credentials.mode ?? DEFAULT_MODE;
  const login = await loginBilimClass({
    username: credentials.username,
    password: credentials.password,
    mode
  });
  const academicContext = resolveBilimClassAcademicContext(login);

  if (!academicContext.schoolId || !academicContext.eduYear) {
    throw new Error("BilimClass did not return a valid school context");
  }

  const persisted = await saveBilimClassConnection({
    mode,
    login: credentials.username,
    password: credentials.password,
    linkedStudentId: studentId,
    accessToken: login.access_token,
    refreshToken: login.refresh_token,
    bilimUserId: academicContext.bilimUserId,
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    groupId: academicContext.groupId,
    groupName: academicContext.groupName,
    studentFullName: academicContext.studentFullName,
    externalRole: academicContext.role
  });

  await prisma.studentProfile.update({
    where: {
      id: studentId
    },
    data: {
      bilimClassGroupId: academicContext.groupId ?? undefined,
      bilimClassStudentUuid: login.user_info.studentInfo.studentGroupUuid ?? undefined
    }
  });

  await writeSyncLog({
    connectionId: persisted.id,
    operation: "connect",
    status: "success",
    requestPayload: {
      linkedStudentId: studentId,
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      groupName: academicContext.groupName,
      source: mode
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
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      groupName: academicContext.groupName,
      mode
    }
  });

  const fullConnection = await getBilimClassConnectionById(persisted.id);
  if (!fullConnection) {
    throw new Error("BilimClass connection could not be loaded after connect");
  }

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

export async function clearStudentBilimClassSession(studentId: string) {
  const connection = await getBilimClassConnectionByStudent(studentId);
  if (!connection) {
    return null;
  }

  await updateConnectionState(connection.id, {
    accessToken: null,
    refreshToken: null,
    lastStatus: "signed-out"
  });

  await writeSyncLog({
    connectionId: connection.id,
    operation: "logout-clear-session",
    status: "success",
    requestPayload: buildConnectionScope({
      ...resolveConnectionSecrets(connection),
      student: connection.student!
    }),
    responseSummary: "Volatile BilimClass session tokens cleared on local logout."
  });

  return true;
}

export async function getStudentBilimClassStatus(studentId: string) {
  const connection = await getBilimClassConnectionByStudent(studentId);

  if (!connection) {
    return {
      connected: false,
      mode: DEFAULT_MODE
    };
  }

  const latestLog = await getConnectionLatestLog(connection.id);
  const scopeKey = connection.student
    ? buildBilimClassScopeKey({
        localStudentId: connection.student.id,
        localUserId: connection.student.user.id,
        bilimUserId: connection.bilimUserId,
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        groupId: connection.groupId
      })
    : null;

  return {
    connected: true,
    mode: connection.mode,
    bilimUserId: connection.bilimUserId,
    schoolId: connection.schoolId,
    eduYear: connection.eduYear,
    groupId: connection.groupId,
    groupName: connection.groupName,
    studentFullName: connection.studentFullName,
    lastStatus: connection.lastStatus,
    lastSyncedAt: connection.lastSyncedAt,
    hasCredentials: Boolean(connection.login && connection.password),
    latestLog,
    cacheKey: scopeKey
  };
}

export async function syncBilimClassYear(connectionId: string) {
  const connection = await getBilimClassConnectionById(connectionId);

  if (!connection || !connection.student) {
    throw new Error("BilimClass connection is not configured");
  }

  const result = await syncConnectionData(resolveConnectionSecrets(connection));

  return {
    connectionId: connection.id,
    studentId: connection.student.id,
    cacheKey: result.cacheKey,
    summary: result.yearSummary
  };
}

export async function syncBilimClassSubjects(params: {
  connectionId: string;
  period?: number;
  periodType?: "quarter" | "halfyear";
}) {
  const connection = await getBilimClassConnectionById(params.connectionId);

  if (!connection || !connection.student) {
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
  const academicContext = resolveBilimClassAcademicContext(login, resolved.eduYear);

  await updateConnectionState(resolved.id, {
    bilimUserId: academicContext.bilimUserId,
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    groupId: academicContext.groupId,
    groupName: academicContext.groupName,
    studentFullName: academicContext.studentFullName,
    externalRole: academicContext.role,
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  });

  const period = params.period ?? 3;
  const periodType = params.periodType ?? "quarter";
  if (!academicContext.groupId) {
    throw new Error("BilimClass group context is missing for this student");
  }

  const cacheKey = buildBilimClassScopeKey({
    localStudentId: connection.student.id,
    localUserId: connection.student.user.id,
    bilimUserId: academicContext.bilimUserId,
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    groupId: academicContext.groupId,
    period,
    periodType
  });

  logBilimClass("info", "subject-sync-request", buildBilimClassDebugContext({
    localStudentId: connection.student.id,
    localUserId: connection.student.user.id,
    bilimUserId: academicContext.bilimUserId,
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    groupId: academicContext.groupId,
    period,
    periodType,
    mode: resolved.mode,
    source: resolved.mode === "live" ? "live" : "mock",
    cacheKey
  }));

  const details = await adapter.getSubjects({
    schoolId: academicContext.schoolId,
    eduYear: academicContext.eduYear,
    period,
    periodType,
    groupId: academicContext.groupId,
    token: login.access_token
  });

  const normalized = normalizeBilimClassSubjectData(details.map((item) => ({
    ...item,
    subjectName: sanitizeBilimClassText(item.subjectName)
  })));

  await writeSyncLog({
    connectionId: resolved.id,
    operation: "subject-sync",
    status: "success",
    requestPayload: {
      cacheKey,
      period,
      periodType,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      bilimUserId: academicContext.bilimUserId
    },
    responseSummary: `Fetched ${normalized.length} subject detail rows for ${periodType}-${period}.`
  });

  return {
    cacheKey,
    rows: normalized
  };
}

export async function getBilimClassStatus(connectionId: string) {
  const connection = await getBilimClassConnectionById(connectionId);

  if (!connection) {
    return {
      connected: false,
      mode: DEFAULT_MODE
    };
  }

  const latestLog = await getConnectionLatestLog(connection.id);
  const scopeKey = connection.student
    ? buildBilimClassScopeKey({
        localStudentId: connection.student.id,
        localUserId: connection.student.user.id,
        bilimUserId: connection.bilimUserId,
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        groupId: connection.groupId
      })
    : null;

  return {
    connected: true,
    mode: connection.mode,
    linkedStudentId: connection.linkedStudentId,
    bilimUserId: connection.bilimUserId,
    schoolId: connection.schoolId,
    eduYear: connection.eduYear,
    groupId: connection.groupId,
    groupName: connection.groupName,
    studentFullName: connection.studentFullName,
    lastStatus: connection.lastStatus,
    lastSyncedAt: connection.lastSyncedAt,
    latestLog,
    cacheKey: scopeKey
  };
}
