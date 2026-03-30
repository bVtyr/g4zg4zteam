import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { WeeklyRequirementsManager } from "@/components/schedule/weekly-requirements-manager";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleTemplatesPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].templates;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/templates"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.table}>
        <WeeklyRequirementsManager
          schoolYear={data.filters.schoolYear}
          term={data.filters.term}
          templates={data.templates}
          classes={data.classes.map((schoolClass) => ({
            id: schoolClass.id,
            name: schoolClass.name
          }))}
          classGroups={data.classGroups.map((group) => ({
            id: group.id,
            name: group.name,
            classId: group.classId,
            className: group.schoolClass.name,
            subjectName: group.subject?.name ?? null
          }))}
          subjects={data.subjects.map((subject) => ({
            id: subject.id,
            name: subject.name
          }))}
          teachers={data.teachers.map((teacher) => ({
            id: teacher.id,
            name: teacher.user.fullName
          }))}
          rooms={data.rooms.map((room) => ({
            id: room.id,
            name: room.name
          }))}
        />
      </PageSection>
    </DashboardShell>
  );
}
