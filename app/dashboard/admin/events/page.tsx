import { Bell, CalendarRange } from "lucide-react";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EventComposer } from "@/components/admin/event-composer";
import { NotificationComposer } from "@/components/forms/notification-composer";
import { PageSection } from "@/components/layout/page-section";
import { requirePageRole, getAdminDashboardData } from "@/lib/services/portal-data";
import { prisma } from "@/lib/db/prisma";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  ru: {
    title: "События и объявления",
    subtitle: "Публикации и коммуникации вынесены в отдельный раздел, чтобы не смешивать их с аналитикой и системным управлением.",
    notifications: "Объявления",
    events: "События",
    feed: "Последние публикации"
  },
  kz: {
    title: "Оқиғалар мен хабарламалар",
    subtitle: "Жарияланымдар мен коммуникациялар аналитика және жүйелік басқарудан бөлек бөлімге шығарылды.",
    notifications: "Хабарламалар",
    events: "Оқиғалар",
    feed: "Соңғы жарияланымдар"
  }
} as const;

export default async function AdminEventsPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const dashboard = await getAdminDashboardData(locale);
  const classes = await prisma.schoolClass.findMany({ select: { id: true, name: true } });

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin/events"
      title={t.title}
      subtitle={t.subtitle}
    >
      <section className="grid gap-6 xl:grid-cols-2">
        <PageSection title={t.notifications} description={t.subtitle}>
          <NotificationComposer classOptions={classes} locale={locale} />
        </PageSection>
        <PageSection title={t.events} description={t.subtitle}>
          <EventComposer locale={locale} />
        </PageSection>
      </section>

      <PageSection title={t.feed} description={t.subtitle}>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="panel p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Bell className="h-5 w-5 text-royal" />
              {t.notifications}
            </div>
            <div className="mt-4 space-y-3">
              {dashboard.notifications.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-medium text-ink">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-600">{item.body}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-ink">
              <CalendarRange className="h-5 w-5 text-aqua" />
              {t.events}
            </div>
            <div className="mt-4 space-y-3">
              {dashboard.events.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-medium text-ink">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-600">{item.description}</div>
                  {item.location ? <div className="mt-2 text-xs text-slate-500">{item.location}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageSection>
    </DashboardShell>
  );
}
