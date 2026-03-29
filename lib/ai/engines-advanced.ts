import { ScoreType, TrendLabel, type AttendanceRecord, type GradeRecord, type Subject } from "@prisma/client";
import { type Locale, translateRiskStatus, translateSubject, translateTrend } from "@/lib/i18n";
import { average, clamp, safeJsonParse } from "@/lib/utils";
import { getSubjectKnowledgeProfile, localized } from "@/lib/ai/knowledge-base";

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

export type KnowledgeGap = {
  key: string;
  title: string;
  mastery: number;
  reason: string;
};

export type TutorResource = {
  title: string;
  provider: string;
  url: string;
  duration: string;
  topic: string;
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
  knowledgeGaps: KnowledgeGap[];
  recommendedResources: TutorResource[];
  predictedAssessmentLabel: string;
  tutorHeadline: string;
};

export function detectTrend(scores: Array<number | null | undefined>): TrendLabel {
  const clean = scores.filter((value): value is number => typeof value === "number");
  if (clean.length < 2) return TrendLabel.stable;
  const deltas = clean.slice(1).map((value, index) => value - clean[index]);
  const sum = deltas.reduce((acc, value) => acc + value, 0);
  if (deltas.some((value) => value <= -12) || sum <= -15) return TrendLabel.critical_decline;
  if (sum <= -6) return TrendLabel.declining;
  if (sum >= 6) return TrendLabel.improving;
  return TrendLabel.stable;
}

function periodLabel(locale: Locale, grade: GradeRecord) {
  if (locale === "kz") {
    if (grade.periodType === "halfyear") return `${grade.periodNumber}-жартыжылдық`;
    if (grade.periodType === "year") return "Жылдық";
    return `${grade.periodNumber}-тоқсан`;
  }
  if (grade.periodType === "halfyear") return `${grade.periodNumber} полугодие`;
  if (grade.periodType === "year") return "Годовой";
  return `${grade.periodNumber} четверть`;
}

function inferKnowledgeGaps(
  locale: Locale,
  input: SubjectAnalyticsInput,
  averageScore: number | null,
  trend: TrendLabel,
  volatility: number,
  orderedGrades: GradeRecord[]
) {
  const profile = getSubjectKnowledgeProfile(input.subject.name);
  const misses = input.attendance?.totalMissCount ?? 0;
  const unexcused = input.attendance?.missingWithoutReason ?? 0;
  const weakestPeriod = [...orderedGrades]
    .filter((grade) => typeof grade.normalizedScore === "number")
    .sort((a, b) => (a.normalizedScore ?? 0) - (b.normalizedScore ?? 0))[0];
  const avg = averageScore ?? (input.subject.creditType === ScoreType.no_score ? 72 : 65);

  return profile.topics
    .map((topic, index) => {
      let mastery = avg - index * 4;
      if (avg < 75 && index === 0) mastery -= 14;
      if (avg < 62 && index <= 1) mastery -= 10;
      if ((trend === TrendLabel.declining || trend === TrendLabel.critical_decline) && index === 1) {
        mastery -= trend === TrendLabel.critical_decline ? 18 : 12;
      }
      if ((misses >= 3 || unexcused > 0) && index === 2) mastery -= 12 + Math.min(unexcused * 3, 8);
      if (volatility >= 18 && index === Math.min(profile.topics.length - 1, 2)) mastery -= 10;
      if (input.subject.creditType === ScoreType.no_score) mastery = 84 - misses * 4 - unexcused * 6 - index * 3;
      if (input.subject.creditType === ScoreType.credit) mastery -= 6;

      const reasons: string[] = [];
      if (avg < 75) reasons.push(localized(locale, topic.reasons.low));
      if (trend === TrendLabel.declining || trend === TrendLabel.critical_decline) reasons.push(localized(locale, topic.reasons.trend));
      if (misses >= 3 || unexcused > 0) reasons.push(localized(locale, topic.reasons.attendance));
      if (volatility >= 18) reasons.push(localized(locale, topic.reasons.volatility));
      if (weakestPeriod) {
        reasons.push(
          locale === "kz"
            ? `ең әлсіз кезең: ${periodLabel(locale, weakestPeriod).toLowerCase()}`
            : `самый слабый период: ${periodLabel(locale, weakestPeriod).toLowerCase()}`
        );
      }

      return {
        key: topic.key,
        title: localized(locale, topic.title),
        mastery: clamp(Math.round(mastery), 12, 96),
        reason: (reasons[0] ?? (locale === "kz" ? "тақырыпты қайта бекіту қажет" : "тему нужно дополнительно закрепить")),
        resource: {
          title: localized(locale, topic.resource.title),
          provider: topic.resource.provider,
          url: topic.resource.url,
          duration: localized(locale, topic.resource.duration),
          topic: localized(locale, topic.title)
        }
      };
    })
    .sort((left, right) => left.mastery - right.mastery)
    .slice(0, 3);
}

function generateRecommendations(
  locale: Locale,
  topGap: KnowledgeGap | undefined,
  secondGap: KnowledgeGap | undefined,
  resourceTitle: string | undefined,
  predictedAssessmentLabel: string,
  trend: TrendLabel,
  attendance?: AttendanceRecord | null
) {
  const items: string[] = [];
  if (locale === "kz") {
    if (topGap) items.push(`${topGap.title} бойынша 2 қысқа қайталау слотын және 12 есепті ${predictedAssessmentLabel} дейін орындаңыз.`);
    if (resourceTitle) items.push(`"${resourceTitle}" материалын қарап, сол күні 5 тапсырмамен бекітіңіз.`);
    if ((attendance?.missingWithoutReason ?? 0) > 0) {
      items.push("Себепсіз босатуларды нөлге түсіріп, бір аптаға қатысу жоспарын құрыңыз.");
    } else if (trend === TrendLabel.declining || trend === TrendLabel.critical_decline) {
      items.push("Мұғаліммен қысқа консультация жоспарлап, апталық қайталау ретін қайта құрыңыз.");
    } else if (secondGap) {
      items.push(`${secondGap.title} бойынша one-page summary жасап, аптаның соңында өзін-өзі тексеріңіз.`);
    }
  } else {
    if (topGap) items.push(`Закрой тему "${topGap.title}" через 2 коротких слота и 12 задач до ${predictedAssessmentLabel}.`);
    if (resourceTitle) items.push(`Посмотри материал "${resourceTitle}" и закрепи его 5 контрольными заданиями в тот же день.`);
    if ((attendance?.missingWithoutReason ?? 0) > 0) {
      items.push("Сведи пропуски без причины к нулю и зафиксируй недельный план посещаемости.");
    } else if (trend === TrendLabel.declining || trend === TrendLabel.critical_decline) {
      items.push("Запланируй короткую консультацию с учителем и пересобери недельный порядок повторения.");
    } else if (secondGap) {
      items.push(`Собери one-page summary по теме "${secondGap.title}" и проверь себя в конце недели.`);
    }
  }
  while (items.length < 3) items.push(locale === "kz" ? "Апта соңында mini-check жасап, қате кеткен тапсырмаларды қайта орындаңыз." : "В конце недели сделай mini-check и повторно реши задания, где были ошибки.");
  return items.slice(0, 3);
}

function explainRisk(locale: Locale, subjectName: string, breakdown: RiskBreakdown, averageScore: number | null, trend: TrendLabel, attendance: AttendanceRecord | null | undefined, topGap?: KnowledgeGap) {
  const reasons: string[] = [];
  if ((averageScore ?? 0) < 75) reasons.push(locale === "kz" ? "орташа балл мақсатты деңгейден төмен" : "средний результат ниже целевого уровня");
  if (trend === TrendLabel.declining || trend === TrendLabel.critical_decline) reasons.push(locale === "kz" ? "теріс тренд байқалады" : "наблюдается негативный тренд");
  if ((attendance?.totalMissCount ?? 0) > 2) reasons.push(locale === "kz" ? "сабақ босатулар бар" : "есть пропуски занятий");
  if ((attendance?.missingWithoutReason ?? 0) > 0) reasons.push(locale === "kz" ? "себепсіз босатулар тіркелді" : "есть пропуски без уважительной причины");
  if (topGap) reasons.push(locale === "kz" ? `негізгі олқылық: ${topGap.title.toLowerCase()}` : `ключевой пробел: ${topGap.title.toLowerCase()}`);
  if (!reasons.length) reasons.push(locale === "kz" ? "нәтиже тұрақты және жұмыс аймағында" : "результат стабилен и находится в рабочей зоне");
  const rawScore = Math.round(breakdown.baseRisk + breakdown.trendPenalty + breakdown.attendancePenalty + breakdown.unexcusedPenalty + breakdown.stabilityBoost);
  return locale === "kz" ? `${subjectName}: тәуекел ${rawScore}%. Себептері: ${reasons.join(", ")}.` : `${subjectName}: риск ${rawScore}%. Причины: ${reasons.join(", ")}.`;
}

export function calculateSubjectRisk(input: SubjectAnalyticsInput, locale: Locale): SubjectRiskResult {
  const orderedGrades = [...input.grades].sort((a, b) => a.periodNumber - b.periodNumber);
  const normalizedScores = orderedGrades.map((grade) => grade.normalizedScore);
  const averageScore = average(normalizedScores);
  const trend = detectTrend(normalizedScores);
  const misses = input.attendance?.totalMissCount ?? 0;
  const unexcused = input.attendance?.missingWithoutReason ?? 0;
  const numericScores = normalizedScores.filter((value): value is number => typeof value === "number");
  const volatility = numericScores.length > 1 ? Math.max(...numericScores) - Math.min(...numericScores) : 0;

  const baseRisk = input.subject.creditType === ScoreType.mark ? clamp(100 - (averageScore ?? 65), 10, 70) : input.subject.creditType === ScoreType.credit ? ((averageScore ?? 100) < 50 ? 55 : 18) : 8;
  const trendPenalty = trend === TrendLabel.critical_decline ? 18 : trend === TrendLabel.declining ? 10 : trend === TrendLabel.improving ? -6 : 0;
  const attendancePenalty = clamp(misses * 2.5, 0, 14);
  const unexcusedPenalty = clamp(unexcused * 4, 0, 16);
  const stabilityBoost = volatility <= 10 ? -6 : volatility >= 25 ? 4 : 0;
  let riskScore = clamp(baseRisk + trendPenalty + attendancePenalty + unexcusedPenalty + stabilityBoost);
  if (input.subject.creditType === ScoreType.no_score) riskScore = clamp(attendancePenalty + unexcusedPenalty + (trend === TrendLabel.declining ? 6 : 0), 0, 40);

  const probabilityFail = input.subject.creditType === ScoreType.mark ? clamp(riskScore * 0.62 + (averageScore !== null && averageScore < 60 ? 15 : 0)) : input.subject.creditType === ScoreType.credit ? clamp(riskScore * 0.5) : clamp(riskScore * 0.25);
  const breakdown: RiskBreakdown = { baseRisk, trendPenalty, attendancePenalty, unexcusedPenalty, stabilityBoost };
  const subjectName = translateSubject(locale, input.subject.name);
  const predictedAssessmentLabel = localized(locale, getSubjectKnowledgeProfile(input.subject.name).assessmentLabel);
  const gapCandidates = inferKnowledgeGaps(locale, input, averageScore, trend, volatility, orderedGrades);
  const knowledgeGaps = gapCandidates.map(({ resource: _resource, ...gap }) => gap);
  const recommendedResources = gapCandidates.map((gap) => gap.resource).slice(0, 3);
  const topGap = knowledgeGaps[0];
  const secondGap = knowledgeGaps[1];

  return {
    subjectId: input.subject.id,
    subjectName,
    scoreType: input.subject.creditType,
    averageScore,
    riskScore,
    probabilityFail,
    trend,
    trendLabel: translateTrend(locale, trend),
    status: riskScore >= 60 ? "risk" : riskScore >= 30 ? "stable" : "strong",
    statusLabel: translateRiskStatus(locale, riskScore >= 60 ? "risk" : riskScore >= 30 ? "stable" : "strong"),
    recommendations: generateRecommendations(locale, topGap, secondGap, recommendedResources[0]?.title, predictedAssessmentLabel, trend, input.attendance),
    explanation: explainRisk(locale, subjectName, breakdown, averageScore, trend, input.attendance, topGap),
    breakdown,
    chart: orderedGrades.map((grade) => ({ period: periodLabel(locale, grade), score: grade.normalizedScore })),
    knowledgeGaps,
    recommendedResources,
    predictedAssessmentLabel,
    tutorHeadline: locale === "kz"
      ? `${subjectName} бойынша ${Math.round(probabilityFail)}% тәуекел бар: ${predictedAssessmentLabel} кезінде ${topGap ? `"${topGap.title}"` : "әлсіз тақырып"} шешуші болады.`
      : `По предмету ${subjectName} риск ${Math.round(probabilityFail)}%: на ${predictedAssessmentLabel} ключевым ограничением будет ${topGap ? `"${topGap.title}"` : "слабая тема"}.`
  };
}

export function buildWeeklySummary(locale: Locale, input: { fullName: string; subjectRisks: SubjectRiskResult[]; totalMisses: number }) {
  const strongest = [...input.subjectRisks].filter((item) => item.averageScore !== null).sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0];
  const weakest = [...input.subjectRisks].sort((a, b) => b.riskScore - a.riskScore)[0];
  const topGap = weakest?.knowledgeGaps[0];
  return locale === "kz"
    ? {
        student: input.fullName,
        strongSides: strongest ? [`Күшті бағыт: ${strongest.subjectName} (${Math.round(strongest.averageScore ?? 0)}%).`, `${strongest.subjectName} пәнінде динамика ${strongest.trendLabel.toLowerCase()}.`] : ["Айқын күшті пән әзірге жеткіліксіз."],
        problemZones: weakest ? [`Назар аймағы: ${weakest.subjectName} (${Math.round(weakest.riskScore)}% тәуекел).`, topGap ? `Негізгі тақырыптық олқылық: ${topGap.title}.` : `${weakest.subjectName} бойынша қайталау қажет.`] : ["Критикалық тәуекел аймағы анықталмады."],
        misses: input.totalMisses,
        advice: weakest?.riskScore && weakest.riskScore >= 50 ? `${weakest.predictedAssessmentLabel} алдында ${weakest.subjectName} бойынша 2 қысқа дайындық слоты мен 1 консультация жоспарлаған дұрыс.` : "Қазіргі режимді сақтап, апталық прогресс пен қатысуды бақылауды жалғастырыңыз."
      }
    : {
        student: input.fullName,
        strongSides: strongest ? [`Сильная сторона: ${strongest.subjectName} (${Math.round(strongest.averageScore ?? 0)}%).`, `По предмету ${strongest.subjectName} динамика: ${strongest.trendLabel.toLowerCase()}.`] : ["Явно выраженных сильных предметов пока недостаточно."],
        problemZones: weakest ? [`Зона внимания: ${weakest.subjectName} (${Math.round(weakest.riskScore)}% риска).`, topGap ? `Ключевой тематический пробел: ${topGap.title}.` : `По предмету ${weakest.subjectName} нужен повтор.`] : ["Критических зон не выявлено."],
        misses: input.totalMisses,
        advice: weakest?.riskScore && weakest.riskScore >= 50 ? `Стоит обсудить предмет ${weakest.subjectName} и до ${weakest.predictedAssessmentLabel} зафиксировать 2 коротких слота повторения и 1 консультацию.` : "Поддерживайте текущий режим и отслеживайте прогресс по неделям."
      };
}

export function buildTeacherReport(locale: Locale, input: { className: string; items: Array<{ studentName: string; highestRisk: SubjectRiskResult; avgScore: number | null; misses: number }> }) {
  const strongStudents = input.items.filter((item) => (item.avgScore ?? 0) >= 85 && item.highestRisk.riskScore < 35).map((item) => item.studentName);
  const riskStudents = input.items.filter((item) => item.highestRisk.riskScore >= 55).map((item) => `${item.studentName} (${item.highestRisk.subjectName}${item.highestRisk.knowledgeGaps[0] ? `: ${item.highestRisk.knowledgeGaps[0].title}` : ""})`);
  const attendanceStudents = input.items.filter((item) => item.misses >= 3).map((item) => item.studentName);
  const priority = input.items.filter((item) => item.highestRisk.riskScore >= 65).slice(0, 2).map((item) => `${item.studentName} - ${item.highestRisk.tutorHeadline}`);
  if (locale === "kz") {
    return [`${input.className} сыныбы: ${strongStudents.length} оқушы күшті аймақта, ${riskStudents.length} оқушы ерте араласуды қажет етеді.`, strongStudents.length ? `Көшбасшылар: ${strongStudents.join(", ")}.` : "Айқын көшбасшылар тобы байқалмады.", riskStudents.length ? `Тәуекел тобы: ${riskStudents.join(", ")}.` : "Критикалық тәуекел тобы жоқ.", attendanceStudents.length ? `Қатысу бақылауы қажет: ${attendanceStudents.join(", ")}.` : "Қатысу бойынша елеулі мәселе анықталмады.", priority.length ? `Приоритетті араласу: ${priority.join(" ")}` : "Нақты тақырыптық араласуды қажет ететін оқушылар аз."].join(" ");
  }
  return [`Класс ${input.className}: ${strongStudents.length} учеников в сильной зоне, ${riskStudents.length} требуют раннего вмешательства.`, strongStudents.length ? `Сильные ученики: ${strongStudents.join(", ")}.` : "Ярко выраженной группы лидеров нет.", riskStudents.length ? `Группа риска: ${riskStudents.join(", ")}.` : "Критической группы риска нет.", attendanceStudents.length ? `Внимание к посещаемости: ${attendanceStudents.join(", ")}.` : "Серьезных проблем с посещаемостью не выявлено.", priority.length ? `Приоритетное вмешательство: ${priority.join(" ")}` : "Точечное вмешательство пока требуется ограниченному числу учеников."].join(" ");
}

export function parseBreakdown(value: string) {
  return safeJsonParse<RiskBreakdown>(value, { baseRisk: 0, trendPenalty: 0, attendancePenalty: 0, unexcusedPenalty: 0, stabilityBoost: 0 });
}
