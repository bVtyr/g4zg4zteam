import { GradeSource, ScoreType, type PeriodType } from "@prisma/client";
import { decryptBilimClassSecret } from "@/lib/bilimclass/crypto";
import { buildBilimClassDebugContext, buildBilimClassScopeKey, resolveBilimClassAcademicContext, sanitizeBilimClassText } from "@/lib/bilimclass/context";
import { getBilimClassAdapter, getBilimClassConnectionByStudent } from "@/lib/bilimclass/service";
import type {
  BilimClassPeriod,
  BilimClassSubjectDetail,
  BilimClassYearResponse,
  BilimClassYearRow
} from "@/lib/bilimclass/types";
import { prisma } from "@/lib/db/prisma";
import type { Locale } from "@/lib/i18n";
import { clamp, formatPercent, toNumber } from "@/lib/utils";

export type StudentGradeSummaryRow = {
  subjectId: string;
  subjectName: string;
  scoreType: ScoreType;
  averageScore: number | null;
  currentRawScore: string | null;
  currentNormalizedScore: number | null;
  finalScore: number | null;
  riskScore: number;
  status: "strong" | "stable" | "risk";
  statusLabel: string;
  trendLabel: string;
  periods: Array<{
    id: string;
    label: string;
    periodType: PeriodType;
    periodNumber: number;
    rawScore: string | null;
    normalizedScore: number | null;
    finalScore: number | null;
    recordedAt: Date | string;
  }>;
  attendance: {
    totalMissCount: number;
    missingWithoutReason: number;
    missingBySick: number;
    missingDue: number;
    missingByAnotherReason: number;
  } | null;
};

export type GradeBadgeItem = {
  id: string;
  label: string;
  shortLabel: string;
  tone: "excellent" | "good" | "warning" | "danger" | "neutral";
  meta?: string;
};

export type GradeCategoryStats = {
  formative: number | null;
  summative: number | null;
  term: number | null;
};

export type GradePrediction = {
  score: number | null;
  label: string;
  confidenceLabel: string;
};

export type FinalGradeSummary = {
  period: string | null;
  year: string | null;
  exam: string | null;
  final: string | null;
};

export type GradeSubjectSummary = {
  subjectId: string;
  subjectName: string;
  scoreType: ScoreType;
  grades: GradeBadgeItem[];
  attendance: StudentGradeSummaryRow["attendance"];
  categoryStats: GradeCategoryStats;
  predictedGrade: GradePrediction;
  finalGrade: FinalGradeSummary;
  periodType: "quarter" | "halfyear" | "year";
  periodNumber: number;
  currentValue: string | null;
  averageLabel: string | null;
  riskScore: number;
  statusLabel: string;
  trendLabel: string;
  explanation: string;
  scheduleItems: Array<{
    id: string;
    date: string;
    timeStart: string;
    type: string;
    markMax: number;
  }>;
};

export type GradePeriodSummary = {
  key: string;
  period: number;
  periodType: "quarter" | "halfyear";
  label: string;
  hasData: boolean;
};

export type GradebookView = {
  tabs: Array<{ key: "grades" | "year"; label: string }>;
  activeTab: "grades" | "year";
  periods: GradePeriodSummary[];
  activePeriodKey: string | null;
  rows: GradeSubjectSummary[];
  legend: Array<{ label: string; tone: GradeBadgeItem["tone"] }>;
  dataSource: {
    overviewEndpoint: string;
    detailEndpoint: string;
    strategyNote: string;
    source: "live" | "mock" | "snapshot" | "none";
    remoteError: string | null;
    cacheKey: string | null;
    localStudentId: string;
    bilimUserId: number | null;
    schoolId: number | null;
    groupId: number | null;
    eduYear: number | null;
  };
};

function copy(locale: Locale) {
  return locale === "kz"
    ? {
        tabs: {
          grades: "Бағалар",
          year: "Жылдық қорытынды"
        },
        periodsEmpty: "Кезеңдер табылмады",
        noScore: "Бағаланбайды",
        pass: "Есептелді",
        fail: "Тәуекел",
        confidenceHigh: "Жоғары",
        confidenceMedium: "Орташа",
        confidenceLow: "Төмен",
        quarter: "тоқсан",
        halfyear: "жартыжылдық",
        year: "Жылдық",
        exam: "Емтихан",
        final: "Қорытынды",
        predicted: "Болжам",
        current: "Ағымдағы",
        missing: "Сабақ босату",
        sourceNote: "Жылдық сводка `diary/year` арқылы, таңдалған кезеңнің детализациясы `diary/subjects` арқылы жүктеледі.",
        remoteError: "BilimClass деректерін жаңарту мүмкін болмады. Соңғы сақталған деректер көрсетілді."
      }
    : {
        tabs: {
          grades: "Оценки",
          year: "Годовой итог"
        },
        periodsEmpty: "Периоды не найдены",
        noScore: "Без оценки",
        pass: "Зачёт",
        fail: "Риск",
        confidenceHigh: "Высокая",
        confidenceMedium: "Средняя",
        confidenceLow: "Низкая",
        quarter: "четверть",
        halfyear: "полугодие",
        year: "Годовой",
        exam: "Экзамен",
        final: "Итог",
        predicted: "Прогноз",
        current: "Текущая",
        missing: "Пропуски",
        sourceNote: "Годовая сводка идёт через `diary/year`, детализация выбранного периода через `diary/subjects`.",
        remoteError: "Не удалось обновить BilimClass. Показаны последние сохранённые данные."
      };
}

function periodKey(periodType: "quarter" | "halfyear", period: number) {
  return `${periodType}:${period}`;
}

function normalizePeriodLabel(locale: Locale, period: BilimClassPeriod) {
  const t = copy(locale);
  return period.periodType === "quarter"
    ? `${period.period} ${t.quarter}`
    : `${period.period} ${t.halfyear}`;
}

function derivePeriodsFromSummary(rows: StudentGradeSummaryRow[]) {
  const unique = new Map<string, GradePeriodSummary>();
  for (const row of rows) {
    for (const period of row.periods) {
      if (period.periodType !== "quarter" && period.periodType !== "halfyear") {
        continue;
      }

      const key = periodKey(period.periodType, period.periodNumber);
      if (!unique.has(key)) {
        unique.set(key, {
          key,
          period: period.periodNumber,
          periodType: period.periodType,
          label: period.label,
          hasData: true
        });
      }
    }
  }

  return [...unique.values()].sort((a, b) => {
    if (a.periodType !== b.periodType) {
      return a.periodType === "quarter" ? -1 : 1;
    }
    return a.period - b.period;
  });
}

function scoreToneFromRaw(scoreType: ScoreType, rawScore: string | null, normalizedScore: number | null): GradeBadgeItem["tone"] {
  if (scoreType === ScoreType.no_score) {
    return "neutral";
  }

  if (scoreType === ScoreType.credit) {
    return rawScore === "1" ? "good" : "warning";
  }

  const value = normalizedScore ?? toNumber(rawScore);
  if (value === null) {
    return "neutral";
  }

  if (value >= 85 || value >= 5) {
    return "excellent";
  }
  if (value >= 70 || value >= 4) {
    return "good";
  }
  if (value >= 50 || value >= 3) {
    return "warning";
  }
  return "danger";
}

function formatBadgeLabel(
  locale: Locale,
  scoreType: ScoreType,
  rawScore: string | null,
  normalizedScore: number | null
) {
  const t = copy(locale);
  if (scoreType === ScoreType.no_score) {
    return t.noScore;
  }
  if (scoreType === ScoreType.credit) {
    return rawScore === "1" ? t.pass : t.fail;
  }
  if (rawScore) {
    return rawScore;
  }
  if (normalizedScore !== null) {
    return formatPercent(normalizedScore);
  }
  return "—";
}

function formatFinalSummary(
  locale: Locale,
  row: BilimClassYearRow | null | undefined,
  summaryRow: StudentGradeSummaryRow
): FinalGradeSummary {
  const periodScore =
    summaryRow.periods
      .filter((period) => period.rawScore || period.finalScore || period.normalizedScore !== null)
      .at(-1)?.rawScore ?? summaryRow.currentRawScore;

  return {
    period: periodScore ?? null,
    year: row?.yearScores.yearScore ?? null,
    exam: row?.yearScores.examScore ?? null,
    final: row?.yearScores.finalScore ?? (summaryRow.finalScore !== null ? formatPercent(summaryRow.finalScore) : null)
  };
}

function buildPrediction(locale: Locale, row: StudentGradeSummaryRow): GradePrediction {
  const t = copy(locale);
  if (row.scoreType === ScoreType.no_score) {
    return {
      score: null,
      label: t.noScore,
      confidenceLabel: t.confidenceLow
    };
  }

  const base = row.currentNormalizedScore ?? row.averageScore ?? 65;
  const trendShift = row.status === "strong" ? 5 : row.status === "risk" ? -8 : 0;
  const projected = clamp(base + trendShift - row.riskScore * 0.12);
  const confidenceLabel =
    row.riskScore <= 35 ? t.confidenceHigh : row.riskScore <= 60 ? t.confidenceMedium : t.confidenceLow;

  if (row.scoreType === ScoreType.credit) {
    return {
      score: projected,
      label: projected >= 55 ? t.pass : t.fail,
      confidenceLabel
    };
  }

  const mark = projected >= 90 ? "5" : projected >= 70 ? "4" : projected >= 50 ? "3" : "2";
  return {
    score: projected,
    label: mark,
    confidenceLabel
  };
}

function aggregateCategoryStats(detail: BilimClassSubjectDetail | null, row: StudentGradeSummaryRow): GradeCategoryStats {
  if (!detail || !detail.schedules.length) {
    return {
      formative: row.currentNormalizedScore,
      summative: null,
      term: null
    };
  }

  if (row.scoreType !== ScoreType.mark) {
    return {
      formative: null,
      summative: null,
      term: null
    };
  }

  const totals = detail.schedules.reduce(
    (acc, item) => {
      const bucket = item.type === "soch" ? "term" : item.type === "sor" ? "summative" : "formative";
      acc[bucket] += item.markMax || 0;
      acc.total += item.markMax || 0;
      return acc;
    },
    { formative: 0, summative: 0, term: 0, total: 0 }
  );

  const base = row.currentNormalizedScore ?? row.averageScore;
  if (base === null || totals.total === 0) {
    return {
      formative: null,
      summative: null,
      term: null
    };
  }

  return {
    formative: Math.round((base * totals.formative) / totals.total),
    summative: Math.round((base * totals.summative) / totals.total),
    term: Math.round((base * totals.term) / totals.total)
  };
}

function buildPeriodBadges(
  locale: Locale,
  row: StudentGradeSummaryRow,
  activeTab: "grades" | "year",
  activePeriod: GradePeriodSummary | null
) {
  const t = copy(locale);
  if (activeTab === "year") {
    const currentLabel = formatBadgeLabel(locale, row.scoreType, row.currentRawScore, row.currentNormalizedScore);
    return currentLabel === "—"
      ? []
      : [
          {
            id: `${row.subjectId}-current`,
            label: currentLabel,
            shortLabel: t.current,
            tone: scoreToneFromRaw(row.scoreType, row.currentRawScore, row.currentNormalizedScore)
          }
        ];
  }

  const relevant = row.periods.filter((period) => {
    if (!activePeriod) {
      return period.rawScore || period.finalScore || period.normalizedScore !== null;
    }
    return period.periodType === activePeriod.periodType && period.periodNumber === activePeriod.period;
  });

  const fallback = relevant.length
    ? relevant
    : row.periods.filter((period) => period.rawScore || period.finalScore || period.normalizedScore !== null).slice(-3);

  return fallback.map((period) => ({
    id: period.id,
    label: formatBadgeLabel(locale, row.scoreType, period.rawScore, period.normalizedScore),
    shortLabel: period.label,
    tone: scoreToneFromRaw(row.scoreType, period.rawScore, period.normalizedScore),
    meta: typeof period.recordedAt === "string" ? period.recordedAt : period.recordedAt.toISOString()
  }));
}

function explainRow(locale: Locale, row: StudentGradeSummaryRow) {
  const t = copy(locale);
  const misses = row.attendance?.totalMissCount ?? 0;
  if (row.scoreType === ScoreType.no_score) {
    return `${t.missing}: ${misses}`;
  }

  return row.riskScore >= 60
    ? `${row.trendLabel}. ${t.missing}: ${misses}.`
    : `${row.statusLabel}. ${t.missing}: ${misses}.`;
}

function buildRows(args: {
  locale: Locale;
  summaryRows: StudentGradeSummaryRow[];
  yearResponse: BilimClassYearResponse | null;
  detailRows: BilimClassSubjectDetail[];
  activeTab: "grades" | "year";
  activePeriod: GradePeriodSummary | null;
  subjectUuidBySubjectId: Map<string, string>;
}) {
  const yearRows = new Map((args.yearResponse?.data.rows ?? []).map((row) => [row.eduSubjectUuid, row]));
  const detailMap = new Map(args.detailRows.map((row) => [row.eduSubjectUuid, row]));

  return args.summaryRows.map((row) => {
    const subjectUuid = args.subjectUuidBySubjectId.get(row.subjectId) ?? null;
    const yearRow = subjectUuid ? yearRows.get(subjectUuid) ?? null : null;
    const detail = subjectUuid ? detailMap.get(subjectUuid) ?? null : null;
    const resolvedPeriodType: GradeSubjectSummary["periodType"] =
      args.activeTab === "year" ? "year" : (args.activePeriod?.periodType ?? "quarter");

    return {
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      scoreType: row.scoreType,
      grades: buildPeriodBadges(args.locale, row, args.activeTab, args.activePeriod),
      attendance: row.attendance,
      categoryStats: aggregateCategoryStats(detail, row),
      predictedGrade: buildPrediction(args.locale, row),
      finalGrade: formatFinalSummary(args.locale, yearRow, row),
      periodType: resolvedPeriodType,
      periodNumber: args.activePeriod?.period ?? 0,
      currentValue: formatBadgeLabel(args.locale, row.scoreType, row.currentRawScore, row.currentNormalizedScore),
      averageLabel: row.averageScore !== null ? formatPercent(row.averageScore) : null,
      riskScore: row.riskScore,
      statusLabel: row.statusLabel,
      trendLabel: row.trendLabel,
      explanation: explainRow(args.locale, row),
      scheduleItems:
        detail?.schedules.map((item) => ({
          id: item.uuid,
          date: item.date,
          timeStart: item.timeStart,
          type: item.type,
          markMax: item.markMax
        })) ?? []
    };
  });
}

function chooseActivePeriod(periods: GradePeriodSummary[], requestedKey?: string | null) {
  if (requestedKey) {
    const requested = periods.find((period) => period.key === requestedKey);
    if (requested) {
      return requested;
    }
  }

  return (
    [...periods]
      .filter((period) => period.hasData)
      .sort((a, b) => {
        if (a.periodType !== b.periodType) {
          return a.periodType === "quarter" ? -1 : 1;
        }
        return b.period - a.period;
      })[0] ?? null
  );
}

async function getSubjectUuidBySubjectId(studentId: string) {
  const records = await prisma.gradeRecord.findMany({
    where: {
      studentId,
      source: GradeSource.bilimclass,
      bilimClassRowId: {
        not: null
      }
    },
    select: {
      subjectId: true,
      bilimClassRowId: true,
      recordedAt: true
    },
    orderBy: {
      recordedAt: "desc"
    }
  });

  const map = new Map<string, string>();
  for (const record of records) {
    if (!record.bilimClassRowId || map.has(record.subjectId)) {
      continue;
    }
    map.set(record.subjectId, record.bilimClassRowId);
  }
  return map;
}

async function getRemoteBilimData(studentId: string, locale: Locale, selectedTab: "grades" | "year", requestedPeriodKey?: string | null) {
  const connection = await getBilimClassConnectionByStudent(studentId);

  if (!connection?.student) {
    return {
      source: "none" as const,
      remoteError: null,
      cacheKey: null,
      bilimUserId: null,
      schoolId: null,
      eduYear: null,
      groupId: null,
      periods: [] as GradePeriodSummary[],
      activePeriod: null as GradePeriodSummary | null,
      yearResponse: null as BilimClassYearResponse | null,
      detailRows: [] as BilimClassSubjectDetail[]
    };
  }

  const login = decryptBilimClassSecret(connection.login);
  const password = decryptBilimClassSecret(connection.password);
  if (!login || !password) {
    return {
      source: "snapshot" as const,
      remoteError: "BilimClass credentials are missing for this account",
      cacheKey: null,
      bilimUserId: connection.bilimUserId,
      schoolId: connection.schoolId,
      eduYear: connection.eduYear,
      groupId: connection.groupId,
      periods: [] as GradePeriodSummary[],
      activePeriod: null as GradePeriodSummary | null,
      yearResponse: null as BilimClassYearResponse | null,
      detailRows: [] as BilimClassSubjectDetail[]
    };
  }

  const adapter = getBilimClassAdapter(connection.mode);

  try {
    const auth = await adapter.login({
      username: login,
      password
    });
    const academicContext = resolveBilimClassAcademicContext(auth, connection.eduYear);
    const periods = (
      await adapter.getPeriods({
        schoolId: academicContext.schoolId,
        eduYear: academicContext.eduYear,
        token: auth.access_token
      })
    ).map((period) => ({
      key: periodKey(period.periodType, period.period),
      period: period.period,
      periodType: period.periodType,
      label: normalizePeriodLabel(locale, {
        ...period,
        title: sanitizeBilimClassText(period.title)
      }),
      hasData: period.hasData
    }));

    const yearResponse = await adapter.getYear({
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      token: auth.access_token
    });
    yearResponse.data.groupName = academicContext.groupName ?? sanitizeBilimClassText(yearResponse.data.groupName);
    yearResponse.data.groupId = academicContext.groupId ?? yearResponse.data.groupId;
    yearResponse.data.rows = yearResponse.data.rows.map((row) => ({
      ...row,
      subjectName: sanitizeBilimClassText(row.subjectName)
    }));

    const activePeriod = chooseActivePeriod(periods, requestedPeriodKey);
    const cacheKey = buildBilimClassScopeKey({
      localStudentId: connection.student.id,
      localUserId: connection.student.user.id,
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      period: activePeriod?.period ?? null,
      periodType: selectedTab === "year" ? "year" : activePeriod?.periodType ?? null
    });

    console.info(
      "[bilimclass] gradebook-fetch",
      buildBilimClassDebugContext({
        localStudentId: connection.student.id,
        localUserId: connection.student.user.id,
        bilimUserId: academicContext.bilimUserId,
        schoolId: academicContext.schoolId,
        eduYear: academicContext.eduYear,
        groupId: academicContext.groupId,
        period: activePeriod?.period ?? null,
        periodType: selectedTab === "year" ? "year" : activePeriod?.periodType ?? null,
        mode: connection.mode,
        source: connection.mode === "live" ? "live" : "mock",
        cacheKey
      })
    );

    const detailRows =
      selectedTab === "grades" && activePeriod && academicContext.groupId
        ? (await adapter.getSubjects({
            schoolId: academicContext.schoolId,
            eduYear: academicContext.eduYear,
            period: activePeriod.period,
            periodType: activePeriod.periodType,
            groupId: academicContext.groupId,
            token: auth.access_token
          }))
            .map((row) => ({
              ...row,
              subjectName: sanitizeBilimClassText(row.subjectName)
            }))
        : [];

    return {
      source: connection.mode === "live" ? ("live" as const) : ("mock" as const),
      remoteError: null,
      cacheKey,
      bilimUserId: academicContext.bilimUserId,
      schoolId: academicContext.schoolId,
      eduYear: academicContext.eduYear,
      groupId: academicContext.groupId,
      periods,
      activePeriod,
      yearResponse,
      detailRows
    };
  } catch (error) {
    return {
      source: "snapshot" as const,
      remoteError: error instanceof Error ? error.message : copy(locale).remoteError,
      cacheKey: buildBilimClassScopeKey({
        localStudentId: connection.student.id,
        localUserId: connection.student.user.id,
        bilimUserId: connection.bilimUserId,
        schoolId: connection.schoolId,
        eduYear: connection.eduYear,
        groupId: connection.groupId,
        periodType: selectedTab === "year" ? "year" : null
      }),
      bilimUserId: connection.bilimUserId,
      schoolId: connection.schoolId,
      eduYear: connection.eduYear,
      groupId: connection.groupId,
      periods: [] as GradePeriodSummary[],
      activePeriod: null as GradePeriodSummary | null,
      yearResponse: null as BilimClassYearResponse | null,
      detailRows: [] as BilimClassSubjectDetail[]
    };
  }
}

export async function getStudentBilimClassGradebookView(args: {
  studentId: string;
  locale: Locale;
  summaryRows: StudentGradeSummaryRow[];
  tab?: "grades" | "year";
  periodKey?: string | null;
}) {
  const activeTab = args.tab ?? "grades";
  const subjectUuidBySubjectId = await getSubjectUuidBySubjectId(args.studentId);
  const fallbackPeriods = derivePeriodsFromSummary(args.summaryRows);
  const remote = await getRemoteBilimData(args.studentId, args.locale, activeTab, args.periodKey);
  const periods = remote.periods.length ? remote.periods : fallbackPeriods;
  const activePeriod = activeTab === "grades" ? remote.activePeriod ?? chooseActivePeriod(periods, args.periodKey) : null;

  return {
    tabs: [
      { key: "grades", label: copy(args.locale).tabs.grades },
      { key: "year", label: copy(args.locale).tabs.year }
    ],
    activeTab,
    periods,
    activePeriodKey: activePeriod?.key ?? null,
    rows: buildRows({
      locale: args.locale,
      summaryRows: args.summaryRows,
      yearResponse: remote.yearResponse,
      detailRows: remote.detailRows,
      activeTab,
      activePeriod,
      subjectUuidBySubjectId
    }),
    legend: [
      { label: "90+", tone: "excellent" as const },
      { label: "70-89", tone: "good" as const },
      { label: "50-69", tone: "warning" as const },
      { label: "< 50", tone: "danger" as const }
    ],
    dataSource: {
      overviewEndpoint: "/api/v4/os/clientoffice/diary/year",
      detailEndpoint: "/api/v4/os/clientoffice/diary/subjects",
      strategyNote: copy(args.locale).sourceNote,
      source: remote.source,
      remoteError: remote.remoteError,
      cacheKey: remote.cacheKey,
      localStudentId: args.studentId,
      bilimUserId: remote.bilimUserId,
      schoolId: remote.schoolId,
      groupId: remote.groupId,
      eduYear: remote.eduYear
    }
  } satisfies GradebookView;
}
