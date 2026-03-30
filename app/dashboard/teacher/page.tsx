import Link from "next/link";
import { Role } from "@prisma/client";
import { RiskBadge } from "@/components/cards/risk-badge";
import { TeacherRiskTable } from "@/components/tables/teacher-risk-table";
import { TeacherReportCard } from "@/components/teacher/teacher-report-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MetricCard, PageSection } from "@/components/layout/page-section";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getTeacherDashboardData, requirePageRole } from "@/lib/services/portal-data";

export default async function TeacherDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; band?: string }>;
}) {
  const locale = await getCurrentLocale();
  const session = await requirePageRole([Role.teacher]);
  const data = await getTeacherDashboardData(locale);
  const filters = await searchParams;
  const selectedClassId = filters.classId ?? "all";
  const selectedBand = filters.band ?? "all";

  const filteredTable = data.table.filter((item) => {
    if (selectedClassId !== "all" && item.classId !== selectedClassId) {
      return false;
    }
    if (selectedBand !== "all" && item.riskBand !== selectedBand) {
      return false;
    }
    return true;
  });

  const filteredRiskItems = filteredTable.filter((item) => item.highestRisk);
  const filteredActionQueue = data.actionQueue.filter((item) => {
    if (selectedClassId !== "all" && item.classId !== selectedClassId) {
      return false;
    }
    if (selectedBand !== "all" && item.riskBand !== selectedBand) {
      return false;
    }
    return true;
  });

  const bands = [
    { key: "all", label: "Все" },
    { key: "urgent", label: "Срочно" },
    { key: "watch", label: "Наблюдение" },
    { key: "strong", label: "Сильные" }
  ];

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/teacher"
      title="Teacher Tools"
      subtitle="Риск-аналитика, действия по ученикам и короткий отчёт по классу."
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Классы" value={data.overview.classCount} />
        <MetricCard label="Срочный фокус" value={data.overview.urgentCount} tone="danger" />
        <MetricCard label="Зона наблюдения" value={data.overview.watchCount} tone="accent" />
        <MetricCard
          label="Средний результат"
          value={data.overview.averageScore !== null ? `${Math.round(data.overview.averageScore)}%` : "—"}
          hint={data.overview.summary}
        />
      </section>

      <PageSection
        eyebrow="Teacher Tools"
        title="Главный фокус"
        description="Отберите класс или сегмент и сразу проверьте причину риска и следующий шаг."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {bands.map((band) => {
              const active = selectedBand === band.key;
              const href = `?classId=${selectedClassId}&band=${band.key}`;
              return (
                <Link
                  key={band.key}
                  href={href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-royal text-white" : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {band.label}
                </Link>
              );
            })}
            {data.classOptions.map((schoolClass) => {
              const active = selectedClassId === schoolClass.id;
              const href = `?classId=${schoolClass.id}&band=${selectedBand}`;
              return (
                <Link
                  key={schoolClass.id}
                  href={href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {schoolClass.name}
                </Link>
              );
            })}
            <Link
              href="?classId=all&band=all"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Сбросить
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <TeacherRiskTable items={filteredRiskItems} locale={locale} />
            <div className="space-y-4">
              <TeacherReportCard
                locale={locale}
                headline={data.reportMeta.headline}
                report={data.classReport}
                actions={data.reportMeta.actions}
              />
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-danger/15 bg-danger/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Срочно</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{data.segments.urgent.length}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {data.segments.urgent.slice(0, 3).map((item) => item.studentName).join(", ") || "Нет"}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Наблюдение</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{data.segments.watch.length}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {data.segments.watch.slice(0, 3).map((item) => item.studentName).join(", ") || "Нет"}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Сильные</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{data.segments.strong.length}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {data.segments.strong.slice(0, 3).map((item) => item.studentName).join(", ") || "Нет"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Действия учителя"
        description="Список приоритетных действий собран из риска, тренда и посещаемости."
        action={<Link href="/schedule" className="text-sm font-medium text-royal">Открыть расписание</Link>}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredActionQueue.length ? (
            filteredActionQueue.map((item) => (
              <article key={item.studentId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-ink">{item.studentName}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.className}</div>
                  </div>
                  <RiskBadge score={item.riskScore} locale={locale} />
                </div>
                <div className="mt-3 text-sm font-medium text-ink">{item.highestRisk?.subjectName ?? "Нет предмета"}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.explanation}</p>
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {item.recommendation}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-500 xl:col-span-2">
              По текущим фильтрам приоритетных действий нет.
            </div>
          )}
        </div>
      </PageSection>
    </DashboardShell>
  );
}

