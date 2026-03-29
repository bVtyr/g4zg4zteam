import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ScheduleGeneratorPanel } from "@/components/schedule/schedule-generator-panel";
import { ChangeLogTable } from "@/components/schedule/change-log-table";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

const DEFAULT_EXCEL_PATH = "g:\\заг\\Сабақ кестесі 1-11кл  2025-2026 1 тоқсан.xlsx";

export default async function AdminScheduleGeneratorPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].generator;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/generator"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.panel}>
        <ScheduleGeneratorPanel locale={locale} defaultExcelPath={DEFAULT_EXCEL_PATH} />
      </PageSection>
      <PageSection title={t.logs}>
        <ChangeLogTable locale={locale} changes={data.changes.slice(0, 10)} />
      </PageSection>
    </DashboardShell>
  );
}
