import Link from "next/link";
import { MonitorPlay, Settings2 } from "lucide-react";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MetricCard, PageSection } from "@/components/layout/page-section";
import { requirePageRole } from "@/lib/services/portal-data";
import { prisma } from "@/lib/db/prisma";
import { SLOT_TEMPLATES } from "@/lib/schedule/slot-templates";
import { getCurrentLocale } from "@/lib/i18n/server";

const copy = {
  ru: {
    title: "Настройки",
    subtitle: "Спокойный системный раздел для базовых параметров школы, временной сетки и kiosk mode.",
    rooms: "Кабинеты",
    classes: "Классы",
    slots: "Слоты",
    weekModel: "Учебная неделя",
    weekText: "Пятидневка, 10 фиксированных слотов в день и большой перерыв 13:05–13:50.",
    slotTable: "Шаблон временных слотов",
    kiosk: "Kiosk mode",
    kioskText: "Публичный экран открывается отдельно и использует ту же фирменную тему.",
    openKiosk: "Открыть kiosk"
  },
  kz: {
    title: "Баптаулар",
    subtitle: "Мектептің базалық параметрлері, уақыт торы және kiosk mode үшін тыныш жүйелік бөлім.",
    rooms: "Кабинеттер",
    classes: "Сыныптар",
    slots: "Слоттар",
    weekModel: "Оқу аптасы",
    weekText: "Бескүндік, күніне 10 тұрақты слот және 13:05–13:50 аралығындағы үлкен үзіліс.",
    slotTable: "Уақыт слоттарының шаблоны",
    kiosk: "Kiosk mode",
    kioskText: "Қоғамдық экран бөлек ашылады және сол фирмалық тақырыпты қолданады.",
    openKiosk: "Kiosk ашу"
  }
} as const;

export default async function AdminSettingsPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const session = await requirePageRole([Role.admin]);
  const [rooms, classes] = await Promise.all([prisma.room.count(), prisma.schoolClass.count()]);

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/dashboard/admin/settings"
      title={t.title}
      subtitle={t.subtitle}
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label={t.rooms} value={rooms} />
        <MetricCard label={t.classes} value={classes} />
        <MetricCard label={t.slots} value={SLOT_TEMPLATES.length} tone="accent" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PageSection title={t.weekModel} description={t.weekText}>
          <div className="panel p-5">
            <div className="flex items-start gap-3">
              <Settings2 className="mt-1 h-5 w-5 text-royal" />
              <p className="text-sm text-slate-600">{t.weekText}</p>
            </div>
          </div>
        </PageSection>

        <PageSection
          title={t.kiosk}
          description={t.kioskText}
          action={
            <Link href="/kiosk" className="inline-flex items-center gap-2 rounded-2xl bg-royal px-4 py-2.5 text-sm font-medium text-white">
              <MonitorPlay className="h-4 w-4" />
              {t.openKiosk}
            </Link>
          }
        >
          <div className="panel p-5">
            <p className="text-sm text-slate-600">{t.kioskText}</p>
          </div>
        </PageSection>
      </section>

      <PageSection title={t.slotTable} description={t.weekText}>
        <div className="panel overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Start</th>
                <th className="px-5 py-3">End</th>
              </tr>
            </thead>
            <tbody>
              {SLOT_TEMPLATES.map((slot) => (
                <tr key={slot.slotIndex} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-medium text-ink">{slot.slotIndex}</td>
                  <td className="px-5 py-4">{slot.startTime}</td>
                  <td className="px-5 py-4">{slot.endTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </DashboardShell>
  );
}
