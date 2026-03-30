import { redirect } from "next/navigation";
import {
  Role,
  ScoreType,
  type AttendanceRecord,
  type GradeRecord,
  type StudentProfile,
  type Subject
} from "@prisma/client";
import { getSessionUser, requireSession } from "@/lib/auth/session";
import { ensureStudentBilimClassFresh, getStudentBilimClassStatus } from "@/lib/bilimclass/service";
import { parseBreakdown, buildWeeklySummary, calculateSubjectRisk } from "@/lib/ai/engines-advanced";
import { prisma } from "@/lib/db/prisma";
import { type Locale, translateContent, translateSubject } from "@/lib/i18n";
import { roleLanding } from "@/lib/rbac/access";
import { createAuditLog } from "@/lib/services/audit-log-service";
import { getParentChildrenOverview, getStudentParentLinkOverview } from "@/lib/services/parent-link-service";
import { average } from "@/lib/utils";

type StudentWithRelations = StudentProfile & {
  user: { fullName: string; username: string };
  schoolClass: { id: string; name: string; parallelLabel: string };
  grades: GradeRecord[];
  attendances: AttendanceRecord[];
  achievements: Array<{ id: string; title: string; level: string; description: string | null; achievedAt: Date; verified: boolean }>;
  certificates: Array<{ id: string; title: string; issuer: string; issuedAt: Date; verified: boolean }>;
  portfolioItems: Array<{ id: string; type: string; title: string; description: string | null; verified: boolean; createdAt: Date }>;
  goals: Array<{ id: string; title: string; targetValue: number; currentValue: number; dueDate: Date; status: string }>;
  leaderboardScores: Array<{ id: string; points: number; streakDays: number; rank: number; periodKey: string }>;
  badgeAwards: Array<{ id: string; awardedAt: Date; badge: { name: string; description: string } }>;
  riskAssessments: Array<{
    id: string;
    subjectId: string;
    riskScore: number;
    probabilityFail: number;
    trend: string;
    level: string;
    breakdownJson: string;
    explanation: string;
    recommendations: string;
  }>;
};

async function getSubjectsMap() {
  const subjects = await prisma.subject.findMany();
  return new Map(subjects.map((subject) => [subject.id, subject]));
}

function getLatestAttendance(records: AttendanceRecord[]) {
  return [...records].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
}

function formatPeriodLabel(locale: Locale, grade: GradeRecord) {
  if (locale === "kz") {
    if (grade.periodType === "halfyear") {
      return `${grade.periodNumber}-жартыжылдық`;
    }

    if (grade.periodType === "year") {
      return "Жылдық";
    }

    return `${grade.periodNumber}-тоқсан`;
  }

  if (grade.periodType === "halfyear") {
    return `${grade.periodNumber} полугодие`;
  }

  if (grade.periodType === "year") {
    return "Годовой";
  }

  return `${grade.periodNumber} четверть`;
}

function buildStudentSubjectAnalytics(student: StudentWithRelations, subjectsMap: Map<string, Subject>, locale: Locale) {
  const grouped = new Map<string, { subject: Subject; grades: GradeRecord[]; attendances: AttendanceRecord[] }>();

  for (const grade of student.grades) {
    const subject = subjectsMap.get(grade.subjectId);
    if (!subject) {
      continue;
    }

    const current = grouped.get(grade.subjectId) ?? {
      subject,
      grades: [],
      attendances: []
    };

    current.grades.push(grade);
    grouped.set(grade.subjectId, current);
  }

  for (const attendance of student.attendances) {
    if (!attendance.subjectId) {
      continue;
    }

    const current = grouped.get(attendance.subjectId);
    if (current) {
      current.attendances.push(attendance);
    }
  }

  return [...grouped.values()].map((item) =>
    calculateSubjectRisk(
      {
        subject: item.subject,
        grades: item.grades,
        attendance: getLatestAttendance(item.attendances)
      },
      locale
    )
  );
}

function buildStudentGradebook(
  student: StudentWithRelations,
  subjectsMap: Map<string, Subject>,
  locale: Locale,
  subjectAnalytics: ReturnType<typeof buildStudentSubjectAnalytics>
) {
  const grouped = new Map<
    string,
    {
      subject: Subject;
      grades: GradeRecord[];
      attendances: AttendanceRecord[];
    }
  >();

  for (const grade of student.grades) {
    const subject = subjectsMap.get(grade.subjectId);
    if (!subject) {
      continue;
    }

    const current = grouped.get(grade.subjectId) ?? {
      subject,
      grades: [],
      attendances: []
    };

    current.grades.push(grade);
    grouped.set(grade.subjectId, current);
  }

  for (const attendance of student.attendances) {
    if (!attendance.subjectId) {
      continue;
    }

    const current = grouped.get(attendance.subjectId);
    if (current) {
      current.attendances.push(attendance);
    }
  }

  const analyticsMap = new Map(subjectAnalytics.map((item) => [item.subjectId, item]));

  return [...grouped.entries()]
    .map(([subjectId, item]) => {
      const grades = [...item.grades].sort(
        (a, b) =>
          a.periodNumber - b.periodNumber ||
          a.recordedAt.getTime() - b.recordedAt.getTime()
      );
      const latestMeaningfulGrade =
        [...grades]
          .filter(
            (grade) =>
              grade.rawScore !== null || grade.finalScore !== null || grade.normalizedScore !== null
          )
          .at(-1) ?? grades.at(-1) ?? null;
      const latestAttendance = getLatestAttendance(item.attendances);
      const analytics = analyticsMap.get(subjectId);

      return {
        subjectId,
        subjectName: analytics?.subjectName ?? translateSubject(locale, item.subject.name),
        scoreType: item.subject.creditType,
        averageScore: analytics?.averageScore ?? average(grades.map((grade) => grade.normalizedScore)),
        currentRawScore: latestMeaningfulGrade?.rawScore ?? null,
        currentNormalizedScore: latestMeaningfulGrade?.normalizedScore ?? null,
        finalScore: latestMeaningfulGrade?.finalScore ?? null,
        riskScore: analytics?.riskScore ?? 0,
        status: analytics?.status ?? "stable",
        statusLabel: analytics?.statusLabel ?? "",
        trendLabel: analytics?.trendLabel ?? "",
        periods: grades.map((grade) => ({
          id: grade.id,
          label: formatPeriodLabel(locale, grade),
          periodType: grade.periodType,
          periodNumber: grade.periodNumber,
          rawScore: grade.rawScore,
          normalizedScore: grade.normalizedScore,
          finalScore: grade.finalScore,
          recordedAt: grade.recordedAt
        })),
        attendance: latestAttendance
          ? {
              totalMissCount: latestAttendance.totalMissCount,
              missingWithoutReason: latestAttendance.missingWithoutReason,
              missingBySick: latestAttendance.missingBySick,
              missingDue: latestAttendance.missingDue,
              missingByAnotherReason: latestAttendance.missingByAnotherReason
            }
          : null
      };
    })
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }

      return a.subjectName.localeCompare(b.subjectName);
    });
}

export async function requirePageRole(allowedRoles?: Role[]) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    redirect(roleLanding[session.role]);
  }

  return session;
}

function localizePortfolio(locale: Locale, student: StudentWithRelations) {
  return {
    achievements: student.achievements.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      level: translateContent(locale, item.level),
      description: translateContent(locale, item.description ?? "")
    })),
    certificates: student.certificates.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      issuer: translateContent(locale, item.issuer)
    })),
    items: student.portfolioItems.map((item) => ({
      ...item,
      type: translateContent(locale, item.type),
      title: translateContent(locale, item.title),
      description: translateContent(locale, item.description ?? "")
    })),
    goals: student.goals.map((item) => ({
      ...item,
      title: translateContent(locale, item.title)
    })),
    badges: student.badgeAwards.map((award) => ({
      ...award,
      badge: {
        ...award.badge,
        name: translateContent(locale, award.badge.name),
        description: translateContent(locale, award.badge.description)
      }
    }))
  };
}

export async function getCurrentStudentProfile() {
  const session = await requireSession([Role.student]);
  return prisma.studentProfile.findUniqueOrThrow({
    where: {
      userId: session.id
    },
    include: {
      user: {
        select: {
          fullName: true,
          username: true
        }
      },
      schoolClass: {
        select: {
          id: true,
          name: true,
          parallelLabel: true
        }
      },
      grades: true,
      attendances: true,
      achievements: true,
      certificates: true,
      portfolioItems: true,
      goals: true,
      leaderboardScores: true,
      badgeAwards: {
        include: {
          badge: true
        }
      },
      riskAssessments: true
    }
  }) as Promise<StudentWithRelations>;
}

async function getCurrentStudentProfileId() {
  const session = await requireSession([Role.student]);
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: {
      userId: session.id
    },
    select: {
      id: true
    }
  });

  return student.id;
}

async function getStudentWithRelations(studentId: string) {
  return prisma.studentProfile.findUniqueOrThrow({
    where: {
      id: studentId
    },
    include: {
      user: {
        select: {
          fullName: true,
          username: true
        }
      },
      schoolClass: {
        select: {
          id: true,
          name: true,
          parallelLabel: true
        }
      },
      grades: true,
      attendances: true,
      achievements: true,
      certificates: true,
      portfolioItems: true,
      goals: true,
      leaderboardScores: true,
      badgeAwards: {
        include: {
          badge: true
        }
      },
      riskAssessments: true
    }
  }) as Promise<StudentWithRelations>;
}

export async function getStudentDashboardData(studentId?: string, locale: Locale = "ru") {
  const resolvedStudentId = studentId ?? (await getCurrentStudentProfileId());
  const bilimClassStatus =
    (await ensureStudentBilimClassFresh(resolvedStudentId)) ?? (await getStudentBilimClassStatus(resolvedStudentId));
  const student = await getStudentWithRelations(resolvedStudentId);
  const subjectsMap = await getSubjectsMap();
  const subjectAnalytics = buildStudentSubjectAnalytics(student, subjectsMap, locale);
  const gradebook = buildStudentGradebook(student, subjectsMap, locale, subjectAnalytics);
  const totalMisses = student.attendances.reduce((sum, item) => sum + item.totalMissCount, 0);
  const weeklySummary = buildWeeklySummary(locale, {
    fullName: student.user.fullName,
    subjectRisks: subjectAnalytics,
    totalMisses
  });
  const localizedPortfolio = localizePortfolio(locale, student);

  return {
    student: {
      id: student.id,
      fullName: student.user.fullName,
      className: student.schoolClass.name,
      verifiedProfile: student.verifiedProfile,
      cumulativeScore: student.cumulativeScore,
      rank: student.rank
    },
    bilimClass: {
      ...bilimClassStatus,
      overallAverage:
        average(
          gradebook
            .filter((item) => item.scoreType !== ScoreType.no_score)
            .map((item) => item.averageScore)
        ) ?? null,
      subjectsTracked: gradebook.length,
      riskSubjects: gradebook.filter((item) => item.riskScore >= 60).length,
      gradebook
    },
    grades: subjectAnalytics,
    attendance: {
      totalMisses,
      unexcused: student.attendances.reduce((sum, item) => sum + item.missingWithoutReason, 0),
      bySubject: student.attendances
    },
    portfolio: {
      achievements: localizedPortfolio.achievements,
      certificates: localizedPortfolio.certificates,
      items: localizedPortfolio.items
    },
    gamification: {
      leaderboard: student.leaderboardScores[0] ?? null,
      badges: localizedPortfolio.badges,
      goals: localizedPortfolio.goals
    },
    parentLinking: await getStudentParentLinkOverview(student.id),
    weeklySummary,
    savedRisks: student.riskAssessments.map((item) => ({
      ...item,
      breakdown: parseBreakdown(item.breakdownJson),
      recommendations: item.recommendations.split(",").map((entry) => entry.trim())
    }))
  };
}

function getTeacherRiskBand(score: number) {
  if (score >= 70) {
    return "urgent" as const;
  }

  if (score >= 45) {
    return "watch" as const;
  }

  if (score >= 25) {
    return "stable" as const;
  }

  return "strong" as const;
}

function buildTeacherRiskExplanation(
  locale: Locale,
  input: {
    highestRisk: ReturnType<typeof calculateSubjectRisk> | null;
    misses: number;
    avgScore: number | null;
  }
) {
  if (!input.highestRisk) {
    return locale === "kz"
      ? "Тұрақты қорытынды жасауға дерек әлі жеткіліксіз."
      : "Пока недостаточно данных для устойчивого вывода.";
  }

  const reasons: string[] = [];
  if ((input.avgScore ?? 100) < 70) {
    reasons.push(
      locale === "kz"
        ? `орташа нәтиже ${Math.round(input.avgScore ?? 0)}%`
        : `средний результат ${Math.round(input.avgScore ?? 0)}%`
    );
  }

  if (input.highestRisk.trend === "declining" || input.highestRisk.trend === "critical_decline") {
    reasons.push(locale === "kz" ? "соңғы апталарда төмендеу бар" : "есть спад за последние недели");
  }

  if (input.misses > 0) {
    reasons.push(
      locale === "kz"
        ? `${input.misses} пропуск тіркелген`
        : `${input.misses} пропуск${input.misses === 1 ? "" : input.misses < 5 ? "а" : "ов"}`
    );
  }

  const topGap = input.highestRisk.knowledgeGaps?.[0];
  if (topGap) {
    reasons.push(locale === "kz" ? `негізгі олқылық: ${topGap.title}` : `ключевой пробел: ${topGap.title}`);
  }

  if (!reasons.length) {
    reasons.push(locale === "kz" ? "көрсеткіш тұрақсыз" : "показатели нестабильны");
  }

  return `${input.highestRisk.subjectName}: ${reasons.join(", ")}.`;
}

function buildTeacherRecommendation(
  locale: Locale,
  input: {
    highestRisk: ReturnType<typeof calculateSubjectRisk> | null;
    misses: number;
    avgScore: number | null;
  }
) {
  if (!input.highestRisk) {
    return locale === "kz"
      ? "Тағы 1 апта бақылап, жаңа бағалар түскен соң қайта тексеріңіз."
      : "Понаблюдайте ещё неделю и обновите вывод после новых оценок.";
  }

  const topGap = input.highestRisk.knowledgeGaps?.[0];
  if (input.highestRisk.riskScore >= 70) {
    return locale === "kz"
      ? `Қысқа консультация өткізіп, ${input.highestRisk.subjectName} бойынша ${topGap?.title ?? "әлсіз тақырыпты"} жеке пысықтауға беріңіз.`
      : `Назначьте короткую консультацию и дайте точечную отработку по теме "${topGap?.title ?? "слабая тема"}" в ${input.highestRisk.subjectName}.`;
  }

  if (input.misses >= 3) {
    return locale === "kz"
      ? "Қатысу жоспарын бекітіп, келесі аптада қайта тексеріңіз."
      : "Зафиксируйте план по посещаемости и перепроверьте динамику на следующей неделе.";
  }

  if ((input.avgScore ?? 100) >= 85 && input.highestRisk.riskScore < 25) {
    return locale === "kz"
      ? "Күрделірек тапсырма беріп, оқушыны мықты топта ұстаңыз."
      : "Дайте усложнённое задание и удерживайте ученика в сильной группе.";
  }

  return locale === "kz"
    ? `Келесі сабақта ${topGap?.title ?? input.highestRisk.subjectName} бойынша қысқа бекіту жасаңыз.`
    : `На следующем уроке сделайте короткое закрепление по теме "${topGap?.title ?? input.highestRisk.subjectName}".`;
}

function buildTeacherSummaryText(
  locale: Locale,
  input: {
    classCount: number;
    urgentCount: number;
    watchCount: number;
    strongCount: number;
    attendanceConcernCount: number;
  }
) {
  if (locale === "kz") {
    return `${input.classCount} сынып бақылауда. ${input.urgentCount} оқушыға жедел араласу керек, ${input.watchCount} оқушы бақылау тобында. Қатысу тәуекелі ${input.attendanceConcernCount} оқушыда байқалды.`;
  }

  return `${input.classCount} классов в работе. ${input.urgentCount} учеников требуют быстрого вмешательства, ${input.watchCount} находятся в зоне наблюдения. По посещаемости внимание нужно ${input.attendanceConcernCount} ученикам.`;
}

function buildTeacherNarrativeReport(
  locale: Locale,
  input: {
    className: string;
    items: Array<{
      studentName: string;
      riskBand: "urgent" | "watch" | "stable" | "strong";
      highestRisk: ReturnType<typeof calculateSubjectRisk> | null;
      recommendation: string;
      explanation: string;
    }>;
  }
) {
  const urgent = input.items.filter((item) => item.riskBand === "urgent");
  const watch = input.items.filter((item) => item.riskBand === "watch");
  const strong = input.items.filter((item) => item.riskBand === "strong");
  const top = [...urgent, ...watch].slice(0, 3);

  if (locale === "kz") {
    return [
      `${input.className}: ${strong.length} оқушы тұрақты мықты аймақта, ${urgent.length} оқушыға шұғыл араласу керек, ${watch.length} оқушы бақылауда.`,
      top.length
        ? `Бірінші фокус: ${top.map((item) => `${item.studentName} — ${item.explanation}`).join(" ")}`
        : "Қазір жедел араласуды қажет ететін оқушы жоқ.",
      top.length
        ? `Келесі қадам: ${top.map((item) => `${item.studentName} — ${item.recommendation}`).join(" ")}`
        : "Класс тұрақты режимде жүріп жатыр."
    ].join(" ");
  }

  return [
    `${input.className}: ${strong.length} учеников в сильной зоне, ${urgent.length} требуют быстрого вмешательства, ${watch.length} находятся под наблюдением.`,
    top.length
      ? `Первый фокус: ${top.map((item) => `${item.studentName} — ${item.explanation}`).join(" ")}`
      : "Сейчас нет учеников, которым нужно срочное вмешательство.",
    top.length
      ? `Следующий шаг: ${top.map((item) => `${item.studentName} — ${item.recommendation}`).join(" ")}`
      : "Класс можно вести в текущем темпе без срочных вмешательств."
  ].join(" ");
}

export async function getTeacherDashboardData(locale: Locale = "ru") {
  const session = await requireSession([Role.teacher]);
  const teacher = await prisma.teacherProfile.findUniqueOrThrow({
    where: { userId: session.id },
    include: {
      user: true,
      assignments: {
        include: {
          schoolClass: true,
          subject: true
        }
      }
    }
  });

  const classIds = [...new Set(teacher.assignments.map((item) => item.classId))];
  const students = await prisma.studentProfile.findMany({
    where: {
      classId: {
        in: classIds
      }
    },
    include: {
      user: true,
      schoolClass: true,
      grades: true,
      attendances: true
    }
  });

  const subjectsMap = await getSubjectsMap();
  const items = students.map((student) => {
    const analytics = buildStudentSubjectAnalytics(
      {
        ...student,
        achievements: [],
        certificates: [],
        portfolioItems: [],
        goals: [],
        leaderboardScores: [],
        badgeAwards: [],
        riskAssessments: []
      } as StudentWithRelations,
      subjectsMap,
      locale
    );
    const highestRisk = [...analytics].sort((a, b) => b.riskScore - a.riskScore)[0] ?? null;

    return {
      studentId: student.id,
      classId: student.classId,
      studentName: student.user.fullName,
      className: student.schoolClass.name,
      highestRisk,
      avgScore: average(analytics.map((item) => item.averageScore)),
      misses: student.attendances.reduce((sum, item) => sum + item.totalMissCount, 0),
      analytics
    };
  }).map((item) => {
    const riskScore = item.highestRisk?.riskScore ?? 0;
    const riskBand = getTeacherRiskBand(riskScore);

    return {
      ...item,
      riskScore,
      riskBand,
      explanation: buildTeacherRiskExplanation(locale, {
        highestRisk: item.highestRisk,
        misses: item.misses,
        avgScore: item.avgScore
      }),
      recommendation: buildTeacherRecommendation(locale, {
        highestRisk: item.highestRisk,
        misses: item.misses,
        avgScore: item.avgScore
      })
    };
  });

  const itemsWithRisk = items.filter(
    (
      item
    ): item is (typeof items)[number] & {
      highestRisk: NonNullable<(typeof items)[number]["highestRisk"]>;
    } => item.highestRisk !== null
  );

  return {
    teacher: {
      fullName: teacher.user.fullName,
      title: teacher.title
    },
    assignments: teacher.assignments,
    overview: {
      classCount: classIds.length,
      studentCount: items.length,
      urgentCount: items.filter((item) => item.riskBand === "urgent").length,
      watchCount: items.filter((item) => item.riskBand === "watch").length,
      strongCount: items.filter((item) => item.riskBand === "strong").length,
      attendanceConcernCount: items.filter((item) => item.misses >= 3).length,
      averageScore: average(items.map((item) => item.avgScore)) ?? null,
      summary: buildTeacherSummaryText(locale, {
        classCount: classIds.length,
        urgentCount: items.filter((item) => item.riskBand === "urgent").length,
        watchCount: items.filter((item) => item.riskBand === "watch").length,
        strongCount: items.filter((item) => item.riskBand === "strong").length,
        attendanceConcernCount: items.filter((item) => item.misses >= 3).length
      })
    },
    classOptions: classIds
      .map((classId) => {
        const schoolClass = teacher.assignments.find((item) => item.classId === classId)?.schoolClass;
        return schoolClass
          ? {
              id: schoolClass.id,
              name: schoolClass.name,
              studentCount: items.filter((item) => item.classId === schoolClass.id).length
            }
          : null;
      })
      .filter((item): item is { id: string; name: string; studentCount: number } => item !== null),
    riskStudents: itemsWithRisk
      .filter((item) => item.highestRisk.riskScore >= 45)
      .sort((a, b) => b.highestRisk.riskScore - a.highestRisk.riskScore),
    actionQueue: items
      .filter((item) => item.highestRisk)
      .filter((item) => item.riskBand === "urgent" || item.riskBand === "watch")
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8),
    segments: {
      urgent: items.filter((item) => item.riskBand === "urgent").sort((a, b) => b.riskScore - a.riskScore),
      watch: items.filter((item) => item.riskBand === "watch").sort((a, b) => b.riskScore - a.riskScore),
      strong: items.filter((item) => item.riskBand === "strong").sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    },
    classReport: buildTeacherNarrativeReport(locale, {
      className: teacher.assignments[0]?.schoolClass.name ?? (locale === "kz" ? "Сынып" : "Класс"),
      items
    }),
    reportMeta: {
      generatedAt: new Date(),
      headline:
        locale === "kz"
          ? "Сынып бойынша қысқа есеп"
          : "Краткий отчёт по классу",
      actions:
        items
          .filter((item) => item.highestRisk)
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 3)
          .map((item) => `${item.studentName}: ${item.recommendation}`)
    },
    table: items.sort((a, b) => b.riskScore - a.riskScore || a.studentName.localeCompare(b.studentName))
  };
}

export async function getParentDashboardData(locale: Locale = "ru") {
  const session = await requireSession([Role.parent]);
  const parent = await prisma.parentProfile.findUniqueOrThrow({
    where: { userId: session.id },
    include: {
      user: true,
      links: {
        include: {
          student: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  const childLinks = await getParentChildrenOverview(parent.id);
  const link = parent.links[0];
  const studentDashboard = link ? await getStudentDashboardData(link.studentId, locale) : null;

  return {
    parent: {
      fullName: parent.user.fullName,
      relation: link?.relation ?? null
    },
    linkedChildren: childLinks.linkedChildren,
    child: studentDashboard?.student ?? null,
    grades: studentDashboard?.grades ?? [],
    attendance:
      studentDashboard?.attendance ?? {
        totalMisses: 0,
        unexcused: 0,
        bySubject: []
      },
    achievements: studentDashboard?.portfolio.achievements ?? [],
    weeklySummary: studentDashboard?.weeklySummary ?? null
  };
}

export async function getAdminDashboardData(locale: Locale = "ru") {
  await requireSession([Role.admin]);

  const classes = await prisma.schoolClass.findMany({
    include: {
      students: {
        include: {
          grades: true,
          attendances: true,
          user: true
        }
      }
    }
  });

  const subjects = await prisma.subject.findMany({
    include: {
      grades: true
    }
  });
  const notifications = await prisma.notification.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 5
  });
  const events = await prisma.event.findMany({
    where: {
      isPublished: true
    },
    orderBy: {
      startsAt: "asc"
    },
    take: 5
  });
  const risks = await prisma.riskAssessment.findMany();

  const classRadar = classes.map((schoolClass) => {
    const scores = schoolClass.students.flatMap((student) => student.grades.map((grade) => grade.normalizedScore));
    const totalMisses = schoolClass.students.flatMap((student) => student.attendances).reduce((sum, item) => sum + item.totalMissCount, 0);
    return {
      className: schoolClass.name,
      avgPerformance: average(scores) ?? 0,
      riskShare:
        schoolClass.students.length > 0
          ? (schoolClass.students.filter((student) => (student.cumulativeScore ?? 0) < 80).length / schoolClass.students.length) * 100
          : 0,
      attendanceIssues: totalMisses
    };
  });

  const subjectRadar = subjects.map((subject) => ({
    subject: subject.name,
    avgScore: average(subject.grades.map((grade) => grade.normalizedScore)) ?? 0
  }));

  return {
    school: {
      totalClasses: classes.length,
      totalStudents: classes.reduce((sum, item) => sum + item.students.length, 0),
      riskShare: risks.length ? (risks.filter((risk) => risk.riskScore >= 60).length / risks.length) * 100 : 0,
      attendanceSummary: classes
        .flatMap((item) => item.students.flatMap((student) => student.attendances))
        .reduce((sum, item) => sum + item.totalMissCount, 0)
    },
    classRadar,
    subjectRadar,
    notifications: notifications.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      body: translateContent(locale, item.body)
    })),
    events: events.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      description: translateContent(locale, item.description),
      location: translateContent(locale, item.location ?? "")
    }))
  };
}

export async function getNotificationsForCurrentUser(locale: Locale = "ru") {
  const session = await requireSession();
  const receipts = await prisma.notificationReceipt.findMany({
    where: {
      userId: session.id
    },
    include: {
      notification: true
    },
    orderBy: {
      deliveredAt: "desc"
    }
  });

  return receipts.map((receipt) => ({
    ...receipt,
    notification: {
      ...receipt.notification,
      title: translateContent(locale, receipt.notification.title),
      body: translateContent(locale, receipt.notification.body)
    }
  }));
}

export async function getScheduleForCurrentUser(locale: Locale = "ru") {
  const session = await requireSession();
  const where =
    session.role === Role.student
      ? {
          schoolClass: {
            students: {
              some: {
                userId: session.id
              }
            }
          }
        }
      : session.role === Role.teacher
        ? {
            teacher: {
              userId: session.id
            }
          }
        : session.role === Role.parent
          ? {
              schoolClass: {
                parentLinks: {
                  some: {
                    parent: {
                      userId: session.id
                    }
                  }
                }
              }
            }
          : {};

  const entries = await prisma.scheduleEntry.findMany({
    where,
    include: {
      schoolClass: true,
      subject: true,
      teacher: {
        include: {
          user: true
        }
      },
      room: true
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
  });

  return entries.map((entry) => ({
    ...entry,
    title: translateContent(locale, entry.title),
    subject: entry.subject
      ? {
          ...entry.subject,
          name: translateSubject(locale, entry.subject.name)
        }
      : entry.subject,
    room: entry.room,
    schoolClass: entry.schoolClass,
    teacher: entry.teacher
  }));
}

export async function getPortfolioForCurrentUser(locale: Locale = "ru") {
  const session = await requireSession([Role.student, Role.parent]);

  const studentId =
    session.role === Role.student
      ? (await prisma.studentProfile.findUniqueOrThrow({ where: { userId: session.id } })).id
      : (
          await prisma.parentStudentLink.findFirstOrThrow({
            where: {
              parent: {
                userId: session.id
              }
            }
          })
        ).studentId;

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      user: true,
      achievements: true,
      certificates: true,
      portfolioItems: true,
      badgeAwards: {
        include: {
          badge: true
        }
      }
    }
  });

  return {
    ...student,
    achievements: student.achievements.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      level: translateContent(locale, item.level),
      description: translateContent(locale, item.description ?? "")
    })),
    certificates: student.certificates.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      issuer: translateContent(locale, item.issuer)
    })),
    portfolioItems: student.portfolioItems.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      type: translateContent(locale, item.type),
      description: translateContent(locale, item.description ?? "")
    })),
    badgeAwards: student.badgeAwards.map((award) => ({
      ...award,
      badge: {
        ...award.badge,
        name: translateContent(locale, award.badge.name),
        description: translateContent(locale, award.badge.description)
      }
    }))
  };
}

export async function getKioskFeed(locale: Locale = "ru") {
  const topStudents = await prisma.leaderboardScore.findMany({
    orderBy: {
      points: "desc"
    },
    take: 5,
    include: {
      student: {
        include: {
          user: true,
          schoolClass: true
        }
      }
    }
  });

  const announcements = await prisma.notification.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 5
  });

  const replacements = await prisma.scheduleEntry.findMany({
    where: {
      isReplacement: true
    },
    include: {
      schoolClass: true,
      teacher: {
        include: {
          user: true
        }
      }
    },
    take: 5
  });

  const events = await prisma.event.findMany({
    where: {
      startsAt: {
        gte: new Date()
      }
    },
    orderBy: {
      startsAt: "asc"
    },
    take: 5
  });

  return {
    topStudents: topStudents.map((item) => ({
      name: item.student.user.fullName,
      className: item.student.schoolClass.name,
      points: item.points
    })),
    announcements: announcements.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      body: translateContent(locale, item.body)
    })),
    replacements: replacements.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      schoolClass: item.schoolClass
    })),
    events: events.map((item) => ({
      ...item,
      title: translateContent(locale, item.title),
      location: translateContent(locale, item.location ?? "")
    }))
  };
}

export async function createAdminNotification(input: {
  title: string;
  body: string;
  scope: "role" | "class" | "parallel" | "school";
  targetRoles?: string[];
  classIds?: string[];
  parallel?: string;
}) {
  const session = await requireSession([Role.admin]);

  const notification = await prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      scope: input.scope,
      targetRoles: input.targetRoles?.join(",") ?? null,
      targetClassIds: input.classIds?.join(",") ?? null,
      targetParallel: input.parallel ?? null
    }
  });

  const users = await prisma.user.findMany({
    where:
      input.scope === "role" && input.targetRoles?.length
        ? { role: { in: input.targetRoles as Role[] } }
        : input.scope === "class" && input.classIds?.length
          ? {
              OR: [
                {
                  studentProfile: {
                    classId: {
                      in: input.classIds
                    }
                  }
                },
                {
                  parentProfile: {
                    links: {
                      some: {
                        classId: {
                          in: input.classIds
                        }
                      }
                    }
                  }
                },
                {
                  teacherProfile: {
                    assignments: {
                      some: {
                        classId: {
                          in: input.classIds
                        }
                      }
                    }
                  }
                }
              ]
            }
          : {}
  });

  await prisma.notificationReceipt.createMany({
    data: users.map((user) => ({
      notificationId: notification.id,
      userId: user.id
    }))
  });

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-notification-created",
    status: "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "notification",
    entityId: notification.id,
    message: `Admin created notification ${notification.title}`,
    metadata: input
  });

  return notification;
}

export async function createAdminEvent(input: {
  title: string;
  description: string;
  type: "news" | "competition" | "assembly" | "celebration" | "meeting";
  startsAt: string;
  endsAt: string;
  location?: string;
}) {
  const session = await requireSession([Role.admin]);
  const event = await prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      location: input.location
    }
  });

  await createAuditLog({
    eventType: "admin_action",
    action: "admin-event-created",
    status: "success",
    actorUserId: session.id,
    actorRole: session.role,
    entityType: "event",
    entityId: event.id,
    message: `Admin created event ${event.title}`,
    metadata: input
  });

  return event;
}

