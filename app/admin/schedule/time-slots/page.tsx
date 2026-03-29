import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { TimeSlotEditor } from "@/components/schedule/time-slot-editor";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleTimeSlotsPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].timeSlots;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/time-slots"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.table}>
        <TimeSlotEditor locale={locale} timeSlots={data.timeSlots} />
      </PageSection>
    </DashboardShell>
  );
}
