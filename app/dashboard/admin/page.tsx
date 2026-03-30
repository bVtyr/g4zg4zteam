import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, ShieldCheck, Users } from "lucide-react";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminRadarPanel } from "@/components/charts/admin-radar-panel";
import { LinkPanel, MetricCard, PageSection } from "@/components/layout/page-section";
import { requirePageRole, getAdminDashboardData } from "@/lib/services/portal-data";
import { getAdminManagementData } from "@/lib/services/admin-service";
import { getScheduleModuleData } from "@/lib/services/schedule-module-service";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  ru: {
    title: "Панель управления школой",
    subtitle: "Ключевые риски, изменения в расписании, лента школы и быстрые переходы без перегруженного интерфейса.",
    overview: "Обзор",
    alertsShort: "сигналов",
    quickActions: "Быстрые переходы",
    quickActionsText: "Операционные действия вынесены в отдельные разделы. На главной оставлены только важные сигналы и контекст.",
    alerts: "Критические сигналы",
    changes: "Последние изменения в расписании",
    feed: "Лента школы",
    noData: "Нет данных",
    open: "Открыть раздел",
    totalClasses: "Классы",
    totalStudents: "Ученики",
    riskShare: "Доля риска",
    misses: "Пропуски",
    users: "Пользователи и роли",
    usersText: "Аккаунты, parent-child связи и ручные правки записей.",
    schedule: "Расписание",
    scheduleText: "Генерация, конфликты, замены и absence flow учителей.",
    integrations: "Интеграции",
    integrationsText: "BilimClass, синхронизация и системные журналы.",
    analytics: "Аналитика",
    analyticsText: "Радар по классам и предметам, attendance и динамика.",
    events: "События и объявления",
    eventsText: "Публикации, новости школы и адресные уведомления.",
    settings: "Настройки",
    settingsText: "Слоты, kiosk mode и базовые параметры школы.",
    classesPanel: "Успеваемость по классам",
    subjectsPanel: "Успеваемость по предметам"
  },
  kz: {
    title: "Мектепті басқару панелі",
    subtitle: "Негізгі тәуекелдер, кесте өзгерістері, мектеп лентасы және артық жүктемесіз жылдам өтулер.",
    overview: "Шолу",
    alertsShort: "сигнал",
    quickActions: "Жылдам өтулер",
    quickActionsText: "Операциялық әрекеттер бөлек бөлімдерге шығарылды. Басты бетте тек маңызды сигналдар мен контекст қалды.",
    alerts: "Маңызды сигналдар",
    changes: "Кестедегі соңғы өзгерістер",
    feed: "Мектеп лентасы",
    noData: "Дерек жоқ",
    open: "Бөлімді ашу",
    totalClasses: "Сыныптар",
    totalStudents: "Оқушылар",
    riskShare: "Тәуекел үлесі",
    misses: "Қатыспау",
    users: "Пайдаланушылар мен рөлдер",
    usersText: "Аккаунттар, ата-ана мен бала байланыстары және жазбаларды түзету.",
    schedule: "Кесте",
    scheduleText: "Генерация, конфликттер, ауыстырулар және teacher absence flow.",
    integrations: "Интеграциялар",
    integrationsText: "BilimClass, синхрондау және жүйелік журналдар.",
    analytics: "Аналитика",
    analyticsText: "Сыныптар мен пәндер радары, attendance және динамика.",
    events: "Оқиғалар мен хабарламалар",
    eventsText: "Жарияланымдар, мектеп жаңалықтары және бағытталған хабарламалар.",
    settings: "Баптаулар",
    settingsText: "Слоттар, kiosk mode және мектептің базалық параметрлері.",
    classesPanel: "Сыныптар бойынша үлгерім",
    subjectsPanel: "Пәндер бойынша үлгерім"
  }
} as const;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function AdminDashboardPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const data = await getAdminDashboardData(locale);
  const management = await getAdminManagementData();
  const scheduleData = await getScheduleModuleData();

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin"
      title={t.title}
      subtitle={t.subtitle}
      headerAside={
        <div className="rounded-3xl border border-royal/10 bg-royal px-5 py-4 text-white">
          <div className="text-xs uppercase tracking-[0.2em] text-white/60">{t.overview}</div>
          <div className="mt-1 text-lg font-semibold">{management.criticalAlerts.length} {t.alertsShort}</div>
        </div>
      }
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={t.totalClasses} value={data.school.totalClasses} />
        <MetricCard label={t.totalStudents} value={data.school.totalStudents} />
        <MetricCard label={t.riskShare} value={formatPercent(data.school.riskShare)} tone="danger" />
        <MetricCard label={t.misses} value={data.school.attendanceSummary} tone="accent" />
      </section>

      <PageSection eyebrow={t.overview} title={t.quickActions} description={t.quickActionsText}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LinkPanel href="/dashboard/admin/users" title={t.users} description={t.usersText} />
          <LinkPanel href="/admin/schedule" title={t.schedule} description={t.scheduleText} />
          <LinkPanel href="/dashboard/admin/events" title={t.events} description={t.eventsText} />
          <LinkPanel href="/dashboard/admin/integrations" title={t.integrations} description={t.integrationsText} />
          <LinkPanel href="/dashboard/admin/analytics" title={t.analytics} description={t.analyticsText} />
          <LinkPanel href="/dashboard/admin/settings" title={t.settings} description={t.settingsText} />
        </div>
      </PageSection>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <AlertTriangle className="h-5 w-5 text-danger" />
            {t.alerts}
          </div>
          <div className="mt-4 space-y-3">
            {management.criticalAlerts.length ? (
              management.criticalAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-danger/15 bg-danger/5 p-4">
                  <div className="font-medium text-danger">{alert.title}</div>
                  <div className="mt-2 text-sm text-slate-700">{alert.message}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">{t.noData}</div>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-ink">
              <CalendarClock className="h-5 w-5 text-royal" />
              {t.changes}
            </div>
            <Link href="/admin/schedule" className="inline-flex items-center gap-2 text-sm font-medium text-royal">
              {t.open}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {scheduleData.changes.length ? (
              scheduleData.changes.slice(0, 5).map((change) => (
                <div key={change.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-medium text-ink">{change.scheduleEntry.title}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {change.className ?? "—"} {change.subjectName ? `• ${change.subjectName}` : ""}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{change.notes ?? change.reason}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">{t.noData}</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminRadarPanel
          title={t.classesPanel}
          data={data.classRadar.map((item) => ({ className: item.className, avgPerformance: item.avgPerformance }))}
          dataKey="avgPerformance"
        />
        <AdminRadarPanel
          title={t.subjectsPanel}
          data={data.subjectRadar.map((item) => ({ subject: item.subject, avgScore: item.avgScore }))}
          dataKey="avgScore"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Users className="h-5 w-5 text-aqua" />
            {t.feed}
          </div>
          <div className="mt-4 space-y-3">
            {[...data.events, ...data.notifications].slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-medium text-ink">{item.title}</div>
                <div className="mt-2 text-sm text-slate-600">{"description" in item ? item.description : item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-success" />
            BilimClass
          </div>
          <div className="mt-4 space-y-3">
            {management.bilimConnections.slice(0, 4).map((connection) => (
              <div key={connection.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-medium text-ink">{connection.studentName ?? "—"}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {connection.className ?? "—"} • {connection.lastStatus ?? "—"}
                </div>
                {connection.latestError ? <div className="mt-2 text-sm text-danger">{connection.latestError}</div> : null}
              </div>
            ))}
            <Link href="/dashboard/admin/integrations" className="inline-flex items-center gap-2 text-sm font-medium text-royal">
              {t.open}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
