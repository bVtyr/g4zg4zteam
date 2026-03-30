import Link from "next/link";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LinkPanel, PageSection } from "@/components/layout/page-section";
import { ScheduleActionHub } from "@/components/schedule/schedule-action-hub";
import { ScheduleIssueStack } from "@/components/schedule/schedule-issue-stack";
import { ScheduleOverviewMetrics } from "@/components/schedule/schedule-overview-metrics";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleAdminWorkspace } from "@/lib/services/schedule-planning-service";

export default async function AdminScheduleOverviewPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].overview;
  const session = await requirePageRole([Role.admin]);
  const workspace = await getScheduleAdminWorkspace();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule"
      title={t.title}
      subtitle={t.subtitle}
    >
      <ScheduleOverviewMetrics locale={locale} stats={workspace.dashboard} />

      <PageSection title={t.quick} description={t.subtitle}>
        <ScheduleActionHub locale={locale} latestDraftId={workspace.latestDraft?.id ?? null} />
      </PageSection>

      <PageSection title={locale === "kz" ? "Негізгі экрандар" : "Основные экраны"}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <LinkPanel href="/admin/schedule/generator" title={t.cards.generator[0]} description={t.cards.generator[1]} />
          <LinkPanel href="/admin/schedule/grid" title={t.cards.grid[0]} description={t.cards.grid[1]} />
          <LinkPanel
            href="/admin/schedule/resources"
            title={locale === "kz" ? "Кесте ресурстары" : "Ресурсы расписания"}
            description={
              locale === "kz"
                ? "Мугалiмдер, кабинеттер, пандер және teaching assignments бiр белiмде."
                : "Учителя, кабинеты, предметы и teaching assignments в одном разделе."
            }
          />
          <LinkPanel
            href="/admin/schedule/conflicts"
            title={locale === "kz" ? "Проблемалар" : "Проблемы"}
            description={
              locale === "kz"
                ? "Конфликттер мен орналаспай қалған сабақтарды жинақы көру."
                : "Компактный просмотр конфликтов и неразмещённых уроков."
            }
          />
        </div>
      </PageSection>

      {workspace.latestDraft ? (
        <PageSection title={locale === "kz" ? "Соңғы draft" : "Последний draft"}>
          <ScheduleIssueStack
            locale={locale}
            conflicts={workspace.latestDraft.conflicts.slice(0, 6)}
            unplaced={workspace.latestDraft.unplaced.slice(0, 6)}
            compact
          />
        </PageSection>
      ) : null}
    </DashboardShell>
  );
}
