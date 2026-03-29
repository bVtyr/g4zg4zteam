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
    title: "Пользователи и роли",
    subtitle: "Отдельный рабочий раздел для аккаунтов, ролей, parent links и ручной модерации данных.",
    overview: "Операции",
    users: "Пользователи",
    blocked: "Заблокированы",
    students: "Ученики",
    links: "Привязки"
  },
  kz: {
    title: "Пайдаланушылар мен рөлдер",
    subtitle: "Аккаунттар, рөлдер, parent links және деректерді қолмен модерациялауға арналған бөлек бөлім.",
    overview: "Операциялар",
    users: "Пайдаланушылар",
    blocked: "Бұғатталған",
    students: "Оқушылар",
    links: "Байланыстар"
  }
} as const;

export default async function AdminUsersPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const data = await getAdminManagementData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin/users"
      title={t.title}
      subtitle={t.subtitle}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={t.users} value={data.users.length} />
        <MetricCard label={t.students} value={data.users.filter((item) => item.role === Role.student).length} />
        <MetricCard label={t.blocked} value={data.users.filter((item) => item.isBlocked).length} tone="danger" />
        <MetricCard label={t.links} value={data.parentLinks.length} tone="accent" />
      </section>

      <PageSection
        eyebrow={t.overview}
        title={t.title}
        description={t.subtitle}
        action={
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=users">
              <Download className="h-4 w-4" />
              CSV Users
            </a>
            <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=grades">
              <Download className="h-4 w-4" />
              CSV Grades
            </a>
          </div>
        }
      >
        <AdminControlCenter locale={locale} data={data} sections={["users", "links", "grades"]} showHeader={false} />
      </PageSection>
    </DashboardShell>
  );
}
