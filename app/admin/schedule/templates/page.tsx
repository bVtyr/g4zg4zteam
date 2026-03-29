import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSection } from "@/components/layout/page-section";
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="px-3 py-3">{locale === "kz" ? "Атауы" : "Название"}</th>
                <th className="px-3 py-3">{locale === "kz" ? "Сынып" : "Класс"}</th>
                <th className="px-3 py-3">{locale === "kz" ? "Мұғалім" : "Учитель"}</th>
                <th className="px-3 py-3">{locale === "kz" ? "Пән" : "Предмет"}</th>
                <th className="px-3 py-3">{locale === "kz" ? "Апталық жүктеме" : "Нагрузка в неделю"}</th>
              </tr>
            </thead>
            <tbody>
              {data.templates.map((template) => (
                <tr key={template.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-medium text-ink">{template.title}</td>
                  <td className="px-3 py-3 text-slate-600">{template.schoolClass?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{template.teacher.user.fullName}</td>
                  <td className="px-3 py-3 text-slate-600">{template.subject?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{template.lessonsPerWeek}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </DashboardShell>
  );
}
