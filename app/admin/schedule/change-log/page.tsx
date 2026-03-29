import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ChangeLogTable } from "@/components/schedule/change-log-table";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleChangeLogPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].changeLog;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/change-log"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.table}>
        <ChangeLogTable locale={locale} changes={data.changes} />
      </PageSection>
    </DashboardShell>
  );
}
