import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeacherRiskTable } from "@/components/tables/teacher-risk-table";
import { WeeklyInsightCard } from "@/components/cards/weekly-insight-card";
import { LinkPanel, MetricCard, PageSection } from "@/components/layout/page-section";
import { requirePageRole, getTeacherDashboardData } from "@/lib/services/portal-data";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";
import { Role } from "@prisma/client";

export default async function TeacherDashboardPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const session = await requirePageRole([Role.teacher]);
  const data = await getTeacherDashboardData(locale);
  const atRiskCount = data.riskStudents.length;
  const avgScore =
    data.table.length > 0
      ? Math.round(
          data.table.reduce((sum, item) => sum + (item.avgScore ?? 0), 0) / data.table.length
        )
      : 0;
  const totalMisses = data.table.reduce((sum, item) => sum + item.misses, 0);

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/teacher"
      title={copy.teacher.title}
      subtitle={copy.teacher.subtitle}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={locale === "kz" ? "Сыныптар" : "Классы"} value={new Set(data.assignments.map((item) => item.classId)).size} />
        <MetricCard label={copy.common.risk} value={atRiskCount} tone="danger" />
        <MetricCard label={copy.common.average} value={`${avgScore}%`} tone="accent" />
        <MetricCard label={copy.teacher.misses} value={totalMisses} />
      </section>

      <PageSection
        eyebrow={copy.teacher.title}
        title={locale === "kz" ? "Ерте ескерту" : "Early warning"}
        description={locale === "kz" ? "Тәуекелі жоғары оқушылар жоғарғы бөлек секцияда, ал жалпы сынып көрінісі төменде." : "Ученики группы риска вынесены в верхнюю отдельную секцию, а общий срез класса оставлен ниже."}
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <TeacherRiskTable items={data.riskStudents} locale={locale} />
          <div className="space-y-6">
            <WeeklyInsightCard title={copy.teacher.report} items={[data.classReport]} />
            <div className="grid gap-4 md:grid-cols-2">
              <LinkPanel href="/schedule" title={copy.nav.schedule} description={locale === "kz" ? "Кесте мен ауыстырулар." : "Расписание и замены."} />
              <LinkPanel href="/notifications" title={copy.nav.notifications} description={locale === "kz" ? "Мектеп хабарламалары." : "Школьные сообщения."} />
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection
        title={copy.teacher.performanceView}
        description={locale === "kz" ? "Толық кестелік көрініс filters пен risk context сақтайды." : "Полный табличный режим оставлен для рабочего просмотра без смешивания с summary-блоками."}
        action={<Link href="/schedule" className="text-sm font-medium text-royal">{copy.nav.schedule}</Link>}
      >
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3">{copy.teacher.student}</th>
                  <th className="px-5 py-3">{copy.teacher.highestRisk}</th>
                  <th className="px-5 py-3">{copy.teacher.reason}</th>
                  <th className="px-5 py-3">{copy.teacher.misses}</th>
                </tr>
              </thead>
              <tbody>
                {data.table.map((item) => (
                  <tr key={item.studentId} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-ink">{item.studentName}</td>
                    <td className="px-5 py-4">{item.highestRisk.subjectName}</td>
                    <td className="px-5 py-4 text-slate-600">{item.highestRisk.explanation}</td>
                    <td className="px-5 py-4">{item.misses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageSection>
    </DashboardShell>
  );
}
