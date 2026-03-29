import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ReplacementPanel } from "@/components/schedule/replacement-panel";
import { ChangeLogTable } from "@/components/schedule/change-log-table";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleReplacementsPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].replacements;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/replacements"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.panel}>
        <ReplacementPanel locale={locale} teachers={data.teachers} />
      </PageSection>
      <PageSection title={t.changes}>
        <ChangeLogTable locale={locale} changes={data.changes.slice(0, 20)} />
      </PageSection>
    </DashboardShell>
  );
}
