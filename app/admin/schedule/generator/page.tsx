import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ScheduleGeneratorWorkbench } from "@/components/schedule/schedule-generator-workbench";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleAdminWorkspace } from "@/lib/services/schedule-planning-service";

export default async function AdminScheduleGeneratorPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].generator;
  const session = await requirePageRole([Role.admin]);
  const workspace = await getScheduleAdminWorkspace();

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
        <ScheduleGeneratorWorkbench
          locale={locale}
          initialFilters={{
            schoolYear: workspace.schoolYear,
            term: workspace.term
          }}
          dashboard={workspace.dashboard}
          classes={workspace.classes}
          maxSlotCount={workspace.timeSlots.length}
          timeSlots={workspace.timeSlots}
          initialDraft={workspace.latestDraft}
          initialDraftComparison={workspace.draftComparison}
          initialDraftHealth={workspace.draftHealth}
        />
      </PageSection>
    </DashboardShell>
  );
}
