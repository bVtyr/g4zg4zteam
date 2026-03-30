import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GradeCard } from "@/components/cards/grade-card";
import { AttendanceSummary } from "@/components/cards/attendance-summary";
import { ParentChildLinkCard } from "@/components/cards/parent-child-link-card";
import { WeeklyInsightCard } from "@/components/cards/weekly-insight-card";
import { LinkPanel, MetricCard, PageSection } from "@/components/layout/page-section";
import { requirePageRole, getParentDashboardData } from "@/lib/services/portal-data";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";
import { Role } from "@prisma/client";

export default async function ParentDashboardPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const session = await requirePageRole([Role.parent]);
  const data = await getParentDashboardData(locale);
  const averageScore =
    data.grades.length > 0
      ? Math.round(data.grades.reduce((sum, item) => sum + (item.averageScore ?? 0), 0) / data.grades.length)
      : 0;

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/parent"
      title={copy.parent.title}
      subtitle={copy.parent.subtitle}
    >
      <PageSection
        eyebrow={copy.parent.title}
        title={locale === "kz" ? "Балаға қолжеткізу" : "Доступ к ребенку"}
        description={
          locale === "kz"
            ? "Алдымен баланы қосып, содан кейін қысқа әрі түсінікті ата-ана view ашылады."
            : "Сначала привязка ребенка, затем короткий и понятный родительский обзор."
        }
      >
        <ParentChildLinkCard locale={locale} linkedChildren={data.linkedChildren} />
      </PageSection>

      {data.child ? (
        <>
          <section className="grid gap-4 xl:grid-cols-4">
            <MetricCard label={locale === "kz" ? "Сынып" : "Класс"} value={data.child.className} />
            <MetricCard label={copy.common.average} value={`${averageScore}%`} tone="accent" />
            <MetricCard label={copy.common.totalMisses} value={data.attendance.totalMisses} />
            <MetricCard label={copy.common.risk} value={data.grades.filter((item) => item.riskScore >= 60).length} tone="danger" />
          </section>

          <PageSection
            title={locale === "kz" ? "Оқу нәтижелері" : "Учебные результаты"}
            description={
              locale === "kz"
                ? "Баланың оқу көрінісі қысқа карточкаларға бөлінген."
                : "Академическая картина ребенка собрана в короткие карточки без перегруза."
            }
          >
            <div className="grid gap-4 xl:grid-cols-4">
              {data.grades.slice(0, 4).map((item) => (
                <GradeCard key={item.subjectId} item={item} locale={locale} />
              ))}
            </div>
          </PageSection>

          <PageSection
            title={locale === "kz" ? "Апталық бақылау" : "Недельное наблюдение"}
            description={
              locale === "kz"
                ? "Attendance, AI summary және келесі қадамдар бір секцияда."
                : "Attendance, AI summary и конкретные следующие шаги собраны в одном разделе."
            }
          >
            <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
              <AttendanceSummary totalMisses={data.attendance.totalMisses} unexcused={data.attendance.unexcused} locale={locale} />
              {data.weeklySummary ? (
                <WeeklyInsightCard
                  title={copy.parent.weeklySummary}
                  items={[
                    ...data.weeklySummary.strongSides,
                    ...data.weeklySummary.problemZones,
                    `${data.weeklySummary.misses} ${copy.parent.missesSuffix}`,
                    data.weeklySummary.advice
                  ]}
                />
              ) : null}
            </div>
          </PageSection>

          <PageSection
            title={locale === "kz" ? "Қосымша бөлімдер" : "Дополнительные разделы"}
            description={
              locale === "kz"
                ? "Портфолио мен кестеге жылдам өту."
                : "Быстрый переход к портфолио и расписанию без лишнего шума."
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <LinkPanel href="/portfolio" title={copy.nav.portfolio} description={locale === "kz" ? "Баланың жетістіктері мен сертификаттары." : "Достижения и сертификаты ребенка."} />
              <LinkPanel href="/schedule" title={copy.nav.schedule} description={locale === "kz" ? "Апталық кесте мен ауыстырулар." : "Недельное расписание и замены."} />
            </div>
          </PageSection>
        </>
      ) : null}
    </DashboardShell>
  );
}
