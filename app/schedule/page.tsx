import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { getScheduleForCurrentUser, requirePageRole } from "@/lib/services/portal-data";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function SchedulePage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const session = await requirePageRole();
  const entries = await getScheduleForCurrentUser(locale);

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/schedule"
      title={copy.schedule.title}
      subtitle={copy.schedule.subtitle}
    >
      <ScheduleBoard entries={entries} locale={locale} />
    </DashboardShell>
  );
}
