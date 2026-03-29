import { KioskFeed } from "@/components/kiosk/kiosk-feed";
import { getKioskFeed } from "@/lib/services/portal-data";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function KioskPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const feed = await getKioskFeed(locale);

  return (
    <main className="min-h-screen bg-[#081432] px-6 py-8 text-white">
      <div className="mx-auto max-w-[1800px] space-y-8">
        <header className="flex items-end justify-between gap-6 rounded-[2rem] border border-white/10 bg-white/5 px-8 py-6">
          <div>
            <div className="text-sm uppercase tracking-[0.32em] text-white/50">{copy.kiosk.mode}</div>
            <div className="mt-4">
              <BrandLogo className="w-[240px] rounded-[1.75rem]" priority />
            </div>
          </div>
          <div className="space-y-4 text-right">
            <LanguageSwitcher locale={locale} label={copy.language} names={copy.localeName} dark />
            <div>
              <div className="text-sm text-white/60">{copy.kiosk.autoRefresh}</div>
              <div className="mt-2 text-2xl font-semibold">{copy.kiosk.title}</div>
            </div>
          </div>
        </header>

        <KioskFeed initialData={feed} locale={locale} />
      </div>
    </main>
  );
}
