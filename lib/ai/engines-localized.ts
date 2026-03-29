import { ScoreType, TrendLabel, type AttendanceRecord, type GradeRecord, type Subject } from "@prisma/client";
import { type Locale, translateRiskStatus, translateSubject, translateTrend } from "@/lib/i18n";
import { average, clamp, safeJsonParse } from "@/lib/utils";

export type SubjectAnalyticsInput = {
  subject: Subject;
  grades: GradeRecord[];
  attendance?: AttendanceRecord | null;
};

export type RiskBreakdown = {
  baseRisk: number;
  trendPenalty: number;
  attendancePenalty: number;
  unexcusedPenalty: number;
  stabilityBoost: number;
};

export type SubjectRiskResult = {
  subjectId: string;
  subjectName: string;
  scoreType: ScoreType;
  averageScore: number | null;
  riskScore: number;
  probabilityFail: number;
  trend: TrendLabel;
  trendLabel: string;
  status: "strong" | "stable" | "risk";
  statusLabel: string;
  recommendations: string[];
  explanation: string;
  breakdown: RiskBreakdown;
  chart: Array<{ period: string; score: number | null }>;
};

export function detectTrend(scores: Array<number | null | undefined>): TrendLabel {
  const clean = scores.filter((value): value is number => typeof value === "number");
  if (clean.length < 2) {
    return TrendLabel.stable;
  }

  const deltas = clean.slice(1).map((value, index) => value - clean[index]);
  const sum = deltas.reduce((acc, value) => acc + value, 0);
  const steepDrop = deltas.some((value) => value <= -12);

  if (steepDrop || sum <= -15) {
    return TrendLabel.critical_decline;
  }

  if (sum <= -6) {
    return TrendLabel.declining;
  }

  if (sum >= 6) {
    return TrendLabel.improving;
  }

  return TrendLabel.stable;
}

function periodLabel(locale: Locale, grade: GradeRecord) {
  if (locale === "kz") {
    return grade.periodType === "halfyear" ? `${grade.periodNumber}-жартыжылдық` : `${grade.periodNumber}-тоқсан`;
  }

  return grade.periodType === "halfyear" ? `${grade.periodNumber} полугодие` : `${grade.periodNumber} четверть`;
}

function generateRecommendations(locale: Locale, input: {
  subjectName: string;
  scoreType: ScoreType;
  trend: TrendLabel;
  attendance?: AttendanceRecord | null;
  averageScore: number | null;
}) {
  const recommendations: string[] = [];

  if (locale === "kz") {
    if (input.scoreType === ScoreType.mark) {
      recommendations.push(
        (input.averageScore ?? 0) < 70
          ? `${input.subjectName} пәні бойынша негізгі тақырыптарды қайталап, базалық тапсырмалардағы олқылықтарды жабу.`
          : `${input.subjectName} пәні бойынша нәтижені сақтау үшін осы аптада 2 қысқа практика орындау.`
      );
    }

    if (input.scoreType === ScoreType.credit) {
      recommendations.push("Міндетті нормативтерді тұрақты орындап, сынақ белсенділігін белгілеу.");
    }

    if (input.trend === TrendLabel.declining || input.trend === TrendLabel.critical_decline) {
      recommendations.push("Мұғаліммен консультация жоспарлап, апталық қайталау жоспарын қайта құру.");
    }

    if ((input.attendance?.missingWithoutReason ?? 0) > 0) {
      recommendations.push("Себепсіз босатуларды азайтып, куратормен қатысу жоспарын келісу.");
    }

    if (recommendations.length < 3) {
      recommendations.push("Соңғы тапсырмалар бойынша шағын диагностика өткізіп, әлсіз тақырыптарды бекіту.");
    }
  } else {
    if (input.scoreType === ScoreType.mark) {
      recommendations.push(
        (input.averageScore ?? 0) < 70
          ? `Повторить ключевые темы по предмету ${input.subjectName} и закрыть пробелы по базовым заданиям.`
          : `Закрепить результат по предмету ${input.subjectName} через 2 короткие практики на этой неделе.`
      );
    }

    if (input.scoreType === ScoreType.credit) {
      recommendations.push("Поддерживать выполнение обязательных нормативов и фиксировать прогресс по зачетным активностям.");
    }

    if (input.trend === TrendLabel.declining || input.trend === TrendLabel.critical_decline) {
      recommendations.push("Запланировать консультацию с учителем и пересобрать недельный план повторения.");
    }

    if ((input.attendance?.missingWithoutReason ?? 0) > 0) {
      recommendations.push("Снизить пропуски без причины и согласовать с куратором план посещаемости.");
    }

    if (recommendations.length < 3) {
      recommendations.push("Сделать мини-диагностику по последним заданиям и закрепить слабые темы.");
    }
  }

  return recommendations.slice(0, 3);
}

function explainRisk(locale: Locale, input: {
  subjectName: string;
  trend: TrendLabel;
  breakdown: RiskBreakdown;
  averageScore: number | null;
  attendance?: AttendanceRecord | null;
}) {
  const reasons: string[] = [];

  if ((input.averageScore ?? 0) < 75) {
    reasons.push(locale === "kz" ? "орташа балл мақсатты деңгейден төмен" : "средний результат ниже целевого уровня");
  }

  if (input.trend === TrendLabel.declining || input.trend === TrendLabel.critical_decline) {
    reasons.push(locale === "kz" ? "теріс тренд байқалады" : "наблюдается негативный тренд");
  }

  if ((input.attendance?.totalMissCount ?? 0) > 2) {
    reasons.push(locale === "kz" ? "сабақ босатулар бар" : "есть пропуски занятий");
  }

  if ((input.attendance?.missingWithoutReason ?? 0) > 0) {
    reasons.push(locale === "kz" ? "себепсіз босатулар тіркелді" : "есть пропуски без уважительной причины");
  }

  if (!reasons.length) {
    reasons.push(locale === "kz" ? "нәтиже тұрақты және жұмыс аймағында" : "результат стабилен и находится в рабочей зоне");
  }

  return locale === "kz"
    ? `${input.subjectName}: тәуекел ${Math.round(
        input.breakdown.baseRisk +
          input.breakdown.trendPenalty +
          input.breakdown.attendancePenalty +
          input.breakdown.unexcusedPenalty +
          input.breakdown.stabilityBoost
      )}%. Себептері: ${reasons.join(", ")}.`
    : `${input.subjectName}: риск ${Math.round(
        input.breakdown.baseRisk +
          input.breakdown.trendPenalty +
          input.breakdown.attendancePenalty +
          input.breakdown.unexcusedPenalty +
          input.breakdown.stabilityBoost
      )}%. Причины: ${reasons.join(", ")}.`;
}

export function calculateSubjectRisk(input: SubjectAnalyticsInput, locale: Locale): SubjectRiskResult {
  const orderedGrades = [...input.grades].sort((a, b) => a.periodNumber - b.periodNumber);
  const normalizedScores = orderedGrades.map((grade) => grade.normalizedScore);
  const averageScore = average(normalizedScores);
  const trend = detectTrend(normalizedScores);
  const misses = input.attendance?.totalMissCount ?? 0;
  const unexcused = input.attendance?.missingWithoutReason ?? 0;
  const volatility =
    normalizedScores.filter((value): value is number => typeof value === "number").length > 1
      ? Math.max(...normalizedScores.filter((value): value is number => typeof value === "number")) -
        Math.min(...normalizedScores.filter((value): value is number => typeof value === "number"))
      : 0;

  const baseRisk =
    input.subject.creditType === ScoreType.mark
      ? clamp(100 - (averageScore ?? 65), 10, 70)
      : input.subject.creditType === ScoreType.credit
        ? (averageScore ?? 100) < 50
          ? 55
          : 18
        : 8;

  const trendPenalty =
    trend === TrendLabel.critical_decline ? 18 : trend === TrendLabel.declining ? 10 : trend === TrendLabel.improving ? -6 : 0;
  const attendancePenalty = clamp(misses * 2.5, 0, 14);
  const unexcusedPenalty = clamp(unexcused * 4, 0, 16);
  const stabilityBoost = volatility <= 10 ? -6 : volatility >= 25 ? 4 : 0;

  let riskScore = clamp(baseRisk + trendPenalty + attendancePenalty + unexcusedPenalty + stabilityBoost);

  if (input.subject.creditType === ScoreType.no_score) {
    riskScore = clamp(attendancePenalty + unexcusedPenalty + (trend === TrendLabel.declining ? 6 : 0), 0, 40);
  }

  const probabilityFail =
    input.subject.creditType === ScoreType.mark
      ? clamp(riskScore * 0.62 + (averageScore !== null && averageScore < 60 ? 15 : 0))
      : input.subject.creditType === ScoreType.credit
        ? clamp(riskScore * 0.5)
        : clamp(riskScore * 0.25);

  const breakdown: RiskBreakdown = {
    baseRisk,
    trendPenalty,
    attendancePenalty,
    unexcusedPenalty,
    stabilityBoost
  };

  const localizedSubjectName = translateSubject(locale, input.subject.name);

  return {
    subjectId: input.subject.id,
    subjectName: localizedSubjectName,
    scoreType: input.subject.creditType,
    averageScore,
    riskScore,
    probabilityFail,
    trend,
    trendLabel: translateTrend(locale, trend),
    status: riskScore >= 60 ? "risk" : riskScore >= 30 ? "stable" : "strong",
    statusLabel: translateRiskStatus(locale, riskScore >= 60 ? "risk" : riskScore >= 30 ? "stable" : "strong"),
    recommendations: generateRecommendations(locale, {
      subjectName: localizedSubjectName,
      scoreType: input.subject.creditType,
      trend,
      attendance: input.attendance,
      averageScore
    }),
    explanation: explainRisk(locale, {
      subjectName: localizedSubjectName,
      trend,
      breakdown,
      averageScore,
      attendance: input.attendance
    }),
    breakdown,
    chart: orderedGrades.map((grade) => ({
      period: periodLabel(locale, grade),
      score: grade.normalizedScore
    }))
  };
}

export function buildWeeklySummary(locale: Locale, input: {
  fullName: string;
  subjectRisks: SubjectRiskResult[];
  totalMisses: number;
}) {
  const strongest = [...input.subjectRisks]
    .filter((item) => item.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0];
  const weakest = [...input.subjectRisks].sort((a, b) => b.riskScore - a.riskScore)[0];

  return locale === "kz"
    ? {
        student: input.fullName,
        strongSides: strongest ? [`Күшті бағыт: ${strongest.subjectName}`] : ["Айқын күшті пәндер әзірге жеткіліксіз."],
        problemZones: weakest ? [`Тәуекел аймағы: ${weakest.subjectName}`] : ["Сыни тәуекел аймағы жоқ."],
        misses: input.totalMisses,
        advice:
          weakest?.riskScore && weakest.riskScore >= 50
            ? `${weakest.subjectName} пәні бойынша екі қысқа қайталау слотын жоспарлап, мұғаліммен байланыс орнатқан дұрыс.`
            : "Қазіргі режимді сақтап, апта сайын прогресс пен қатысуды бақылаңыз."
      }
    : {
        student: input.fullName,
        strongSides: strongest ? [`Сильная сторона: ${strongest.subjectName}`] : ["Явно выраженных сильных предметов пока недостаточно."],
        problemZones: weakest ? [`Зона внимания: ${weakest.subjectName}`] : ["Критических зон не выявлено."],
        misses: input.totalMisses,
        advice:
          weakest?.riskScore && weakest.riskScore >= 50
            ? `Стоит обсудить предмет ${weakest.subjectName} и зафиксировать два коротких слота на повторение.`
            : "Поддерживайте текущий режим и отслеживайте прогресс по неделям."
      };
}

export function buildTeacherReport(locale: Locale, input: {
  className: string;
  items: Array<{ studentName: string; highestRisk: SubjectRiskResult; avgScore: number | null; misses: number }>;
}) {
  const strongStudents = input.items
    .filter((item) => (item.avgScore ?? 0) >= 85 && item.highestRisk.riskScore < 35)
    .map((item) => item.studentName);
  const riskStudents = input.items
    .filter((item) => item.highestRisk.riskScore >= 55)
    .map((item) => `${item.studentName} (${item.highestRisk.subjectName})`);
  const attendanceStudents = input.items
    .filter((item) => item.misses >= 3)
    .map((item) => item.studentName);

  if (locale === "kz") {
    return [
      `${input.className} сыныбы: ${strongStudents.length} оқушы күшті аймақта, ${riskStudents.length} оқушы ерте араласуды қажет етеді.`,
      strongStudents.length ? `Күшті оқушылар: ${strongStudents.join(", ")}.` : "Айқын көшбасшылар тобы байқалмады.",
      riskStudents.length ? `Тәуекел тобы: ${riskStudents.join(", ")}.` : "Сыни тәуекел тобы жоқ.",
      attendanceStudents.length
        ? `Қатысуға назар: ${attendanceStudents.join(", ")}.`
        : "Қатысу бойынша елеулі мәселе табылмады."
    ].join(" ");
  }

  return [
    `Класс ${input.className}: ${strongStudents.length} учеников в сильной зоне, ${riskStudents.length} требуют раннего вмешательства.`,
    strongStudents.length ? `Сильные ученики: ${strongStudents.join(", ")}.` : "Ярко выраженной группы лидеров нет.",
    riskStudents.length ? `Группа риска: ${riskStudents.join(", ")}.` : "Критической группы риска нет.",
    attendanceStudents.length ? `Внимание к посещаемости: ${attendanceStudents.join(", ")}.` : "Серьезных проблем с посещаемостью не выявлено."
  ].join(" ");
}

export function parseBreakdown(value: string) {
  return safeJsonParse<RiskBreakdown>(value, {
    baseRisk: 0,
    trendPenalty: 0,
    attendancePenalty: 0,
    unexcusedPenalty: 0,
    stabilityBoost: 0
  });
}
