import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { RoomForm } from "@/components/schedule/room-form";
import { RoomManagementTable } from "@/components/schedule/room-management-table";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleRoomsPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].rooms;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/rooms"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.form}>
        <RoomForm locale={locale} />
      </PageSection>
      <PageSection title={t.table}>
        <RoomManagementTable locale={locale} rooms={data.rooms} />
      </PageSection>
    </DashboardShell>
  );
}
