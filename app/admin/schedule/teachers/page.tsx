import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { TeacherForm } from "@/components/schedule/teacher-form";
import { TeacherManagementTable } from "@/components/schedule/teacher-management-table";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";

export default async function AdminScheduleTeachersPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].teachers;
  const session = await requirePageRole([Role.admin]);
  const data = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/teachers"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.form}>
        <TeacherForm locale={locale} rooms={data.rooms} />
      </PageSection>
      <PageSection title={t.table}>
        <TeacherManagementTable locale={locale} teachers={data.teachers} />
      </PageSection>
    </DashboardShell>
  );
}
