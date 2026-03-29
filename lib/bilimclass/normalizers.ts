import { GradeSource, PeriodType, ScoreType } from "@prisma/client";
import { toNumber } from "@/lib/utils";
import type {
  BilimClassAttendance,
  BilimClassSubjectDetail,
  BilimClassYearResponse,
  BilimClassYearRow
} from "@/lib/bilimclass/types";

export function mapBilimClassScoreType(scoreType: BilimClassYearRow["scoreType"]): ScoreType {
  if (scoreType === "credit") {
    return ScoreType.credit;
  }

  if (scoreType === "no_score") {
    return ScoreType.no_score;
  }

  return ScoreType.mark;
}

export function normalizeBilimClassAttendance(attendances: BilimClassAttendance) {
  return {
    totalMissCount: attendances.totalMissCount,
    missingBySick: attendances.missingBySick,
    missingWithoutReason: attendances.missingWithoutReason,
    missingDue: attendances.missingDue,
    missingByAnotherReason: attendances.missingByAnotherReason
  };
}

export function normalizeBilimClassYearData(
  response: BilimClassYearResponse,
  schoolYear: number,
  subjectIdMap: Record<string, string>,
  studentId: string
) {
  const records = response.data.rows.flatMap((row) => {
    const subjectId = subjectIdMap[row.subjectName];
    if (!subjectId) {
      return [];
    }

    const entries = [
      row.attestations.quarter1,
      row.attestations.quarter2,
      row.attestations.quarter3,
      row.attestations.quarter4
    ];

    return entries.map((rawScore, index) => ({
      subjectId,
      studentId,
      source: GradeSource.bilimclass,
      periodType: row.periodType === "halfyear" ? PeriodType.halfyear : PeriodType.quarter,
      periodNumber: index + 1,
      scoreType: mapBilimClassScoreType(row.scoreType),
      rawScore,
      normalizedScore:
        row.scoreType === "mark"
          ? toNumber(rawScore) !== null
            ? (toNumber(rawScore)! / 5) * 100
            : null
          : row.scoreType === "credit"
            ? rawScore === "1"
              ? 100
              : rawScore === null
                ? null
                : 35
            : null,
      finalScore: toNumber(row.yearScores.finalScore),
      recordedAt: new Date(),
      schoolYear,
      bilimClassRowId: row.eduSubjectUuid
    }));
  });

  return records;
}

export function normalizeBilimClassSubjectData(details: BilimClassSubjectDetail[]) {
  return details.map((item) => ({
    subjectName: item.subjectName,
    eduSubjectUuid: item.eduSubjectUuid,
    finalScore: toNumber(item.finalScore),
    periodType: item.periodType,
    scoreType: item.periodInfo.scoreType,
    scheduleCount: item.schedules.length,
    schedules: item.schedules
  }));
}
