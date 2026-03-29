import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminRadarPanel } from "@/components/charts/admin-radar-panel";
import { MetricCard, PageSection } from "@/components/layout/page-section";
import { requirePageRole, getAdminDashboardData } from "@/lib/services/portal-data";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  ru: {
    title: "Аналитика",
    subtitle: "Сводный аналитический слой школы без operational controls и лишних форм.",
    riskShare: "Доля риска",
    misses: "Пропуски",
    classesPanel: "Успеваемость по классам",
    subjectsPanel: "Успеваемость по предметам",
    classRisk: "Классы внимания",
    subjectRisk: "Предметы внимания"
  },
  kz: {
    title: "Аналитика",
    subtitle: "Operational controls пен артық формаларсыз мектептің жинақталған аналитикалық қабаты.",
    riskShare: "Тәуекел үлесі",
    misses: "Қатыспау",
    classesPanel: "Сыныптар бойынша үлгерім",
    subjectsPanel: "Пәндер бойынша үлгерім",
    classRisk: "Назар қажет сыныптар",
    subjectRisk: "Назар қажет пәндер"
  }
} as const;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function AdminAnalyticsPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const data = await getAdminDashboardData(locale);
  const topClasses = [...data.classRadar].sort((a, b) => b.riskShare - a.riskShare).slice(0, 5);
  const lowSubjects = [...data.subjectRadar].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin/analytics"
      title={t.title}
      subtitle={t.subtitle}
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <MetricCard label={t.riskShare} value={formatPercent(data.school.riskShare)} tone="danger" />
        <MetricCard label={t.misses} value={data.school.attendanceSummary} tone="accent" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminRadarPanel
          title={t.classesPanel}
          data={data.classRadar.map((item) => ({ className: item.className, avgPerformance: item.avgPerformance }))}
          dataKey="avgPerformance"
        />
        <AdminRadarPanel
          title={t.subjectsPanel}
          data={data.subjectRadar.map((item) => ({ subject: item.subject, avgScore: item.avgScore }))}
          dataKey="avgScore"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PageSection title={t.classRisk} description={t.subtitle}>
          <div className="panel p-5">
            <div className="space-y-3">
              {topClasses.map((item) => (
                <div key={item.className} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-ink">{item.className}</div>
                    <div className="text-sm font-semibold text-danger">{formatPercent(item.riskShare)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Avg {Math.round(item.avgPerformance)} · Misses {item.attendanceIssues}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageSection>
        <PageSection title={t.subjectRisk} description={t.subtitle}>
          <div className="panel p-5">
            <div className="space-y-3">
              {lowSubjects.map((item) => (
                <div key={item.subject} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-ink">{item.subject}</div>
                    <div className="text-sm font-semibold text-warning">{Math.round(item.avgScore)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageSection>
      </section>
    </DashboardShell>
  );
}
