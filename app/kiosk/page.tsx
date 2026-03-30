import { KioskFeed } from "@/components/kiosk/kiosk-feed";
import { getKioskFeed } from "@/lib/services/portal-data";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getCurrentLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const locale = await getCurrentLocale();
  const feed = await getKioskFeed(locale);
  const copy =
    locale === "kz"
      ? {
          mode: "School kiosk",
          title: "Aqbobek Lyceum live panel",
          autoRefresh: "30 сек сайын жаңарады",
          language: "Тіл",
          localeName: {
            ru: "Русский",
            kz: "Қазақша"
          }
        }
      : {
          mode: "School kiosk",
          title: "Aqbobek Lyceum live panel",
          autoRefresh: "Обновление каждые 30 секунд",
          language: "Язык",
          localeName: {
            ru: "Русский",
            kz: "Қазақша"
          }
        };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(67,97,238,0.18),_transparent_32%),linear-gradient(180deg,#071225_0%,#091837_54%,#081327_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-[1800px] space-y-8">
        <header className="flex items-end justify-between gap-6 rounded-[2rem] border border-white/10 bg-white/5 px-8 py-6 shadow-[0_28px_80px_rgba(7,18,37,0.45)]">
          <div>
            <div className="text-sm uppercase tracking-[0.32em] text-white/50">{copy.mode}</div>
            <div className="mt-4">
              <BrandLogo className="w-[240px] rounded-[1.75rem]" priority />
            </div>
          </div>
          <div className="space-y-4 text-right">
            <LanguageSwitcher locale={locale} label={copy.language} names={copy.localeName} dark />
            <div>
              <div className="text-sm text-white/60">{copy.autoRefresh}</div>
              <div className="mt-2 text-2xl font-semibold">{copy.title}</div>
            </div>
          </div>
        </header>

        <KioskFeed initialData={feed} locale={locale} />
      </div>
    </main>
  );
}
