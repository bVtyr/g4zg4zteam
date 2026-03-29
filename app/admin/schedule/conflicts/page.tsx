import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ConflictTable } from "@/components/schedule/conflict-table";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleConflictsPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].conflicts;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/conflicts"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.table}>
        <ConflictTable locale={locale} conflicts={data.conflicts} />
      </PageSection>
    </DashboardShell>
  );
}
