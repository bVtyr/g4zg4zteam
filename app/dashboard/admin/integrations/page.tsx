import { Download } from "lucide-react";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { MetricCard, PageSection } from "@/components/layout/page-section";
import { requirePageRole } from "@/lib/services/portal-data";
import { getAdminManagementData } from "@/lib/services/admin-service";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  ru: {
    title: "Интеграции",
    subtitle: "Статус BilimClass, ручная синхронизация и системные журналы в одном отдельном разделе.",
    connections: "Подключения",
    errors: "Ошибки",
    logs: "Логи"
  },
  kz: {
    title: "Интеграциялар",
    subtitle: "BilimClass статусы, қолмен синхрондау және жүйелік журналдар бір бөлек бөлімде.",
    connections: "Қосылымдар",
    errors: "Қателер",
    logs: "Логтар"
  }
} as const;

export default async function AdminIntegrationsPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const data = await getAdminManagementData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin/integrations"
      title={t.title}
      subtitle={t.subtitle}
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label={t.connections} value={data.bilimConnections.length} />
        <MetricCard label={t.errors} value={data.bilimConnections.filter((item) => item.latestError).length} tone="danger" />
        <MetricCard label={t.logs} value={data.auditLogs.length} tone="accent" />
      </section>

      <PageSection
        title={t.title}
        description={t.subtitle}
        action={
          <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=logs">
            <Download className="h-4 w-4" />
            CSV Logs
          </a>
        }
      >
        <AdminControlCenter locale={locale} data={data} sections={["alerts", "integrations", "logs"]} showHeader={false} />
      </PageSection>
    </DashboardShell>
  );
}
