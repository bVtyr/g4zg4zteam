import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ScheduleControlCenter } from "@/components/admin/schedule-control-center";
import { PageSection } from "@/components/layout/page-section";
import { requirePageRole } from "@/lib/services/portal-data";
import { getAdminScheduleData } from "@/lib/services/admin-schedule-service";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  ru: {
    title: "Расписание",
    subtitle: "Отдельный operational workspace для генерации сетки, конфликтов, отсутствий, лент и ручных правок."
  },
  kz: {
    title: "Кесте",
    subtitle: "Торды генерациялау, конфликттер, болмау жағдайлары, ленталар және қолмен түзетуге арналған бөлек operational workspace."
  }
} as const;

export default async function AdminSchedulePage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const data = await getAdminScheduleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin/schedule"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.title} description={t.subtitle}>
        <ScheduleControlCenter locale={locale} data={data} showHeader={false} />
      </PageSection>
    </DashboardShell>
  );
}
