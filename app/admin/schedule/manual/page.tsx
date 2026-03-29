import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ScheduleEntryEditor } from "@/components/schedule/schedule-entry-editor";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleManualPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].manual;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/manual"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.editor}>
        <ScheduleEntryEditor
          locale={locale}
          classes={data.classes}
          subjects={data.subjects}
          teachers={data.teachers}
          rooms={data.rooms}
        />
      </PageSection>
      <PageSection title={t.snapshot}>
        <ScheduleGrid locale={locale} entries={data.entries} timeSlots={data.timeSlots} />
      </PageSection>
    </DashboardShell>
  );
}
