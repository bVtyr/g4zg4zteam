import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
import { ScheduleIssueStack } from "@/components/schedule/schedule-issue-stack";
import { getCurrentLocale } from "@/lib/i18n/server";
import { schedulePageCopy } from "@/lib/schedule/copy";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleAdminWorkspace } from "@/lib/services/schedule-planning-service";

export default async function AdminScheduleConflictsPage() {
  const locale = await getCurrentLocale();
  const t = schedulePageCopy[locale].conflicts;
  const session = await requirePageRole([Role.admin]);
  const workspace = await getScheduleAdminWorkspace();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/conflicts"
      title={t.title}
      subtitle={t.subtitle}
    >
      <PageSection title={t.table}>
        <ScheduleIssueStack
          locale={locale}
          conflicts={workspace.conflicts}
          unplaced={workspace.latestDraft?.unplaced ?? []}
        />
      </PageSection>
    </DashboardShell>
  );
}
