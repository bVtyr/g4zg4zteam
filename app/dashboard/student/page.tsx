import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BilimClassConnectionCard } from "@/components/cards/bilimclass-connection-card";
import { AITutorPanel } from "@/components/cards/ai-tutor-panel";
import { GradeCard } from "@/components/cards/grade-card";
import { StudentParentLinkCard } from "@/components/cards/student-parent-link-card";
import { AttendanceSummary } from "@/components/cards/attendance-summary";
import { WeeklyInsightCard } from "@/components/cards/weekly-insight-card";
import { StudentGradebook } from "@/components/grades/student-gradebook";
import { SubjectTrendChart } from "@/components/charts/subject-trend-chart";
import { LinkPanel, MetricCard, PageSection } from "@/components/layout/page-section";
import { getStudentBilimClassGradebookView } from "@/lib/bilimclass/gradebook";
import { requirePageRole, getStudentDashboardData } from "@/lib/services/portal-data";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";
import { Role } from "@prisma/client";

export default async function StudentDashboardPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const session = await requirePageRole([Role.student]);
  const data = await getStudentDashboardData(undefined, locale);
  const gradebookView = await getStudentBilimClassGradebookView({
    studentId: data.student.id,
    locale,
    summaryRows: data.bilimClass.gradebook
  });
  const topRisk = [...data.grades].sort((a, b) => b.riskScore - a.riskScore)[0] ?? null;
  const topSubjects = [...data.grades].sort((a, b) => b.riskScore - a.riskScore).slice(0, 4);
  const bilimStatusLabel =
    locale === "kz"
      ? data.bilimClass.connected
        ? "Қосылған"
        : "Қосылмаған"
      : data.bilimClass.connected
        ? "Подключен"
        : "Не подключен";

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/student"
      title={copy.student.title}
      subtitle={copy.student.subtitle}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={copy.common.average} value={data.bilimClass.overallAverage !== null ? `${Math.round(data.bilimClass.overallAverage)}%` : "—"} />
        <MetricCard label="BilimClass" value={bilimStatusLabel} tone={data.bilimClass.connected ? "success" : "default"} />
        <MetricCard label={copy.common.risk} value={data.bilimClass.riskSubjects} tone="danger" />
        <MetricCard label={copy.common.totalMisses} value={data.attendance.totalMisses} tone="accent" />
      </section>

      <PageSection
        eyebrow={copy.student.title}
        title={locale === "kz" ? "Оқу көрінісі" : "Учебная картина"}
        description={
          locale === "kz"
            ? "Жоғарыда осы аптаға маңызды пәндер мен тәуекел сигналдары көрсетілген."
            : "Сверху только ключевые предметы недели и сигналы риска."
        }
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {topSubjects.map((item) => (
            <GradeCard key={item.subjectId} item={item} locale={locale} />
          ))}
        </div>
      </PageSection>

      <PageSection
        title={locale === "kz" ? "Бағалар мен синхрондау" : "Оценки и синхронизация"}
        description={
          locale === "kz"
            ? "BilimClass байланысы мен gradebook бір бөлімде жиналды."
            : "Подключение BilimClass и рабочий gradebook собраны в одном разделе."
        }
      >
        <div className="space-y-5">
          <BilimClassConnectionCard locale={locale} state={data.bilimClass} />
          <StudentGradebook locale={locale} connected={data.bilimClass.connected} initialData={gradebookView} />
        </div>
      </PageSection>

      <PageSection
        title={locale === "kz" ? "AI талдауы" : "AI-анализ"}
        description={
          locale === "kz"
            ? "Ең тәуекелді пән, тренд және келесі қадамдар бір жерде."
            : "Самый рискованный предмет, тренд и конкретные следующие шаги в одном блоке."
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          {topRisk ? (
            <SubjectTrendChart title={topRisk.subjectName} data={topRisk.chart} locale={locale} />
          ) : (
            <div className="panel p-5 text-sm text-slate-500">{locale === "kz" ? "Дерек жоқ" : "Нет данных"}</div>
          )}
          <div className="space-y-6">
            <AttendanceSummary totalMisses={data.attendance.totalMisses} unexcused={data.attendance.unexcused} locale={locale} />
            {topRisk ? <AITutorPanel locale={locale} item={topRisk} /> : null}
          </div>
        </div>
      </PageSection>

      <PageSection
        title={locale === "kz" ? "Байланыс пен қолдау" : "Связи и поддержка"}
        description={
          locale === "kz"
            ? "Апталық summary, ата-ананы қосу және негізгі бөлімдерге жылдам өту."
            : "Weekly summary, привязка родителя и быстрые переходы к ключевым разделам."
        }
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <WeeklyInsightCard title={copy.student.weeklySummary} items={[...data.weeklySummary.strongSides, ...data.weeklySummary.problemZones, data.weeklySummary.advice]} />
            <StudentParentLinkCard locale={locale} state={data.parentLinking} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <LinkPanel href="/portfolio" title={copy.nav.portfolio} description={locale === "kz" ? "Жетістіктер, сертификаттар және расталған профиль." : "Достижения, сертификаты и подтвержденный профиль."} />
            <LinkPanel href="/schedule" title={copy.nav.schedule} description={locale === "kz" ? "Апталық кесте мен ауыстырулар." : "Недельное расписание и замены."} />
            <LinkPanel href="/notifications" title={copy.nav.notifications} description={locale === "kz" ? "Жеке және мектептік хабарламалар." : "Личные и школьные уведомления."} />
            <div className="panel p-5">
              <div className="text-sm text-slate-500">{locale === "kz" ? "Профиль" : "Профиль"}</div>
              <div className="mt-2 text-lg font-semibold text-ink">{data.student.className}</div>
              <div className="mt-3 text-sm text-slate-600">
                {data.student.verifiedProfile
                  ? locale === "kz"
                    ? "Профиль расталған."
                    : "Профиль подтвержден."
                  : locale === "kz"
                    ? "Профильді толықтыру керек."
                    : "Профиль стоит дополнить."}
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection
        title={copy.student.gamification}
        description={
          locale === "kz"
            ? "Мақсаттар, badges және рейтинг төмендегі секцияда жиналған."
            : "Цели, badges и рейтинг собраны в нижнем блоке."
        }
        action={<Link href="/portfolio" className="text-sm font-medium text-royal">{copy.nav.portfolio}</Link>}
      >
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">{copy.student.gamification}</h3>
            <span className="pill bg-aqua/20 text-ink">{copy.student.streak} {data.gamification.leaderboard?.streakDays ?? 0}</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{copy.student.leaderboardRank}</div>
              <div className="mt-1 text-3xl font-bold text-ink">#{data.gamification.leaderboard?.rank ?? "-"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{copy.student.points}</div>
              <div className="mt-1 text-3xl font-bold text-ink">{data.gamification.leaderboard?.points ?? 0}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.gamification.badges.map((award) => (
              <span key={award.id} className="pill bg-royal/10 text-royal">
                {award.badge.name}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {data.gamification.goals.map((goal) => (
              <div key={goal.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold text-ink">{goal.title}</div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-aqua"
                    style={{
                      width: `${Math.min((goal.currentValue / goal.targetValue) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageSection>
    </DashboardShell>
  );
}
