import { ScoreType, TrendLabel, type AttendanceRecord, type GradeRecord, type Subject } from "@prisma/client";
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
  status: "strong" | "stable" | "risk";
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

export function generateRecommendations(input: {
  subjectName: string;
  scoreType: ScoreType;
  trend: TrendLabel;
  attendance?: AttendanceRecord | null;
  averageScore: number | null;
}) {
  const recommendations: string[] = [];

  if (input.scoreType === ScoreType.mark) {
    if ((input.averageScore ?? 0) < 70) {
      recommendations.push(`Повторить ключевые темы по предмету ${input.subjectName} и закрыть пробелы по базовым заданиям.`);
    } else {
      recommendations.push(`Закрепить текущий результат по предмету ${input.subjectName} через 2 короткие практики на этой неделе.`);
    }
  }

  if (input.scoreType === ScoreType.credit) {
    recommendations.push("Поддерживать выполнение обязательных нормативов и фиксировать прогресс по зачётным активностям.");
  }

  if (input.trend === TrendLabel.declining || input.trend === TrendLabel.critical_decline) {
    recommendations.push("Запланировать консультацию с учителем и пересобрать недельный план повторения.");
  }

  if ((input.attendance?.missingWithoutReason ?? 0) > 0) {
    recommendations.push("Снизить пропуски без причины и согласовать с куратором план посещаемости.");
  }

  if (recommendations.length < 3) {
    recommendations.push("Сделать мини-диагностику по последним заданиям и закрепить слабые темы в формате sprint-review.");
  }

  return recommendations.slice(0, 3);
}

export function explainRisk(input: {
  subjectName: string;
  trend: TrendLabel;
  breakdown: RiskBreakdown;
  averageScore: number | null;
  attendance?: AttendanceRecord | null;
}) {
  const reasons: string[] = [];

  if ((input.averageScore ?? 0) < 75) {
    reasons.push("средний балл ниже целевого уровня");
  }

  if (input.trend === TrendLabel.declining || input.trend === TrendLabel.critical_decline) {
    reasons.push("наблюдается негативный тренд");
  }

  if ((input.attendance?.totalMissCount ?? 0) > 2) {
    reasons.push("есть пропуски занятий");
  }

  if ((input.attendance?.missingWithoutReason ?? 0) > 0) {
    reasons.push("часть пропусков без уважительной причины");
  }

  if (!reasons.length) {
    reasons.push("результат стабилен и находится в рабочем диапазоне");
  }

  return `${input.subjectName}: риск ${Math.round(
    input.breakdown.baseRisk +
      input.breakdown.trendPenalty +
      input.breakdown.attendancePenalty +
      input.breakdown.unexcusedPenalty +
      input.breakdown.stabilityBoost
  )}%. Причины: ${reasons.join(", ")}.`;
}

export function calculateSubjectRisk(input: SubjectAnalyticsInput): SubjectRiskResult {
  const orderedGrades = [...input.grades].sort((a, b) => a.periodNumber - b.periodNumber);
  const normalizedScores = orderedGrades.map((grade) => grade.normalizedScore);
  const averageScore = average(normalizedScores);
  const trend = detectTrend(normalizedScores);
  const misses = input.attendance?.totalMissCount ?? 0;
  const unexcused = input.attendance?.missingWithoutReason ?? 0;
  const volatility =
    normalizedScores.filter((value): value is number => typeof value === "number").length > 1
      ? Math.max(
          ...normalizedScores.filter((value): value is number => typeof value === "number")
        ) -
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

  const recommendations = generateRecommendations({
    subjectName: input.subject.name,
    scoreType: input.subject.creditType,
    trend,
    attendance: input.attendance,
    averageScore
  });

  const explanation = explainRisk({
    subjectName: input.subject.name,
    trend,
    breakdown,
    averageScore,
    attendance: input.attendance
  });

  return {
    subjectId: input.subject.id,
    subjectName: input.subject.name,
    scoreType: input.subject.creditType,
    averageScore,
    riskScore,
    probabilityFail,
    trend,
    status: riskScore >= 60 ? "risk" : riskScore >= 30 ? "stable" : "strong",
    recommendations,
    explanation,
    breakdown,
    chart: orderedGrades.map((grade) => ({
      period: `${grade.periodType}-${grade.periodNumber}`,
      score: grade.normalizedScore
    }))
  };
}

export function buildWeeklySummary(input: {
  fullName: string;
  subjectRisks: SubjectRiskResult[];
  totalMisses: number;
}) {
  const strongest = [...input.subjectRisks]
    .filter((item) => item.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0];
  const weakest = [...input.subjectRisks].sort((a, b) => b.riskScore - a.riskScore)[0];

  return {
    student: input.fullName,
    strongSides: strongest ? [`Сильный блок: ${strongest.subjectName}`] : ["Сильных предметов пока недостаточно для выделения."],
    problemZones: weakest ? [`Риск-зона: ${weakest.subjectName}`] : ["Критических зон нет."],
    misses: input.totalMisses,
    advice:
      weakest?.riskScore && weakest.riskScore >= 50
        ? `Родителю стоит обсудить с ребёнком предмет ${weakest.subjectName} и зафиксировать два коротких слота на повторение.`
        : "Поддерживать текущий режим, отмечая прогресс и посещаемость каждую неделю."
  };
}

export function buildTeacherReport(input: {
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

  return [
    `Класс ${input.className}: ${strongStudents.length} учеников в сильной зоне, ${riskStudents.length} учеников требуют раннего вмешательства.`,
    strongStudents.length ? `Сильные ученики: ${strongStudents.join(", ")}.` : "Ярко выраженной группы лидеров нет.",
    riskStudents.length ? `Группа риска: ${riskStudents.join(", ")}.` : "Критической группы риска нет.",
    attendanceStudents.length
      ? `Внимание к посещаемости: ${attendanceStudents.join(", ")}.`
      : "Серьезных проблем с посещаемостью не выявлено."
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
