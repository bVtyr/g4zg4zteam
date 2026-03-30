import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ScheduleResponsiveFilters } from "@/components/schedule/schedule-filters-responsive";
import { ScheduleResponsiveGrid } from "@/components/schedule/schedule-responsive-grid";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleAdminWorkspace } from "@/lib/services/schedule-planning-service";

export default async function AdminScheduleGridPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; teacherId?: string; roomId?: string; dayOfWeek?: string }>;
}) {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].grid;
  const session = await requirePageRole([Role.admin]);
  const filters = await searchParams;
  const workspace = await getScheduleAdminWorkspace();
  const selectedDay = filters.dayOfWeek ? Number(filters.dayOfWeek) : undefined;
  const filteredEntries = workspace.activeEntries.filter((entry) => {
    const entryClassId = entry.classId ?? entry.classGroup?.classId ?? null;
    if (filters.classId && entryClassId !== filters.classId) {
      return false;
    }
    if (filters.teacherId && entry.teacherId !== filters.teacherId) {
      return false;
    }
    if (filters.roomId && entry.roomId !== filters.roomId) {
      return false;
    }
    if (selectedDay && entry.dayOfWeek !== selectedDay) {
      return false;
    }

    return true;
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
      <PageSection
        title={t.filters}
        action={
          <a
            href="/kiosk/schedule"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            {locale === "kz" ? "Kiosk режимі" : "Kiosk-режим"}
          </a>
        }
      >
        <ScheduleResponsiveFilters
          locale={locale}
          classes={workspace.classes}
          teachers={workspace.teachers}
          rooms={workspace.rooms}
          selected={{
            classId: filters.classId ?? null,
            teacherId: filters.teacherId ?? null,
            roomId: filters.roomId ?? null,
            dayOfWeek: selectedDay ?? null
          }}
        />
      </PageSection>
      <PageSection title={t.table}>
        <ScheduleResponsiveGrid
          locale={locale}
          entries={filteredEntries}
          timeSlots={workspace.timeSlots}
          focusDay={selectedDay ?? null}
        />
      </PageSection>
    </DashboardShell>
  );
}
