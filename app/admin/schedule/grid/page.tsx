import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ScheduleFilters } from "@/components/schedule/schedule-filters";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleGridPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; teacherId?: string; roomId?: string; dayOfWeek?: string }>;
}) {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].grid;
  const session = await requirePageRole([Role.admin]);
  const filters = await searchParams;
  const data = await getScheduleModuleData({
    classId: filters.classId,
    teacherId: filters.teacherId,
    roomId: filters.roomId,
    dayOfWeek: filters.dayOfWeek ? Number(filters.dayOfWeek) : undefined
  });

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/grid"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.filters}>
        <ScheduleFilters
          locale={locale}
          classes={data.classes}
          teachers={data.teachers}
          rooms={data.rooms}
          selected={data.filters}
        />
      </PageSection>
      <PageSection title={t.table}>
        <ScheduleGrid locale={locale} entries={data.entries} timeSlots={data.timeSlots} />
      </PageSection>
    </DashboardShell>
  );
}
