import Link from "next/link";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LinkPanel, PageSection } from "@/components/layout/page-section";
import { ChangeLogTable } from "@/components/schedule/change-log-table";
import { ConflictTable } from "@/components/schedule/conflict-table";
import { ScheduleOverviewCards } from "@/components/schedule/schedule-overview-cards";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleOverviewPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].overview;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule"
      title={t.title}
      subtitle={t.subtitle}
    >
      <ScheduleOverviewCards locale={locale} stats={data.stats} />

      <PageSection title={t.quick} description={t.subtitle}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <LinkPanel href="/admin/schedule/grid" title={t.cards.grid[0]} description={t.cards.grid[1]} />
          <LinkPanel href="/admin/schedule/generator" title={t.cards.generator[0]} description={t.cards.generator[1]} />
          <LinkPanel href="/admin/schedule/manual" title={t.cards.manual[0]} description={t.cards.manual[1]} />
          <LinkPanel href="/admin/schedule/replacements" title={t.cards.replacements[0]} description={t.cards.replacements[1]} />
          <LinkPanel href="/admin/schedule/teachers" title={t.cards.teachers[0]} description={t.cards.teachers[1]} />
          <LinkPanel href="/admin/schedule/rooms" title={t.cards.rooms[0]} description={t.cards.rooms[1]} />
        </div>
      </PageSection>

      <PageSection title={t.recentConflicts}>
        <ConflictTable locale={locale} conflicts={data.conflicts.slice(0, 8)} />
      </PageSection>

      <PageSection title={t.recentChanges}>
        <ChangeLogTable locale={locale} changes={data.changes.slice(0, 12)} />
      </PageSection>
    </DashboardShell>
  );
}
