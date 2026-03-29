import { type Locale, getDictionary } from "@/lib/i18n";

export function PortfolioList({
  achievements,
  certificates,
  items,
  locale
}: {
  achievements: Array<{ id: string; title: string; level: string; description?: string | null; verified: boolean }>;
  certificates: Array<{ id: string; title: string; issuer: string; verified: boolean }>;
  items: Array<{ id: string; type: string; title: string; description?: string | null; verified: boolean }>;
  locale: Locale;
}) {
  const copy = getDictionary(locale);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="panel p-5">
        <h3 className="text-lg font-semibold text-ink">{copy.portfolio.achievements}</h3>
        <div className="mt-4 space-y-3">
          {achievements.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-ink">{item.title}</div>
              <div className="mt-1 text-sm text-slate-500">{item.level}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-5">
        <h3 className="text-lg font-semibold text-ink">{copy.portfolio.certificates}</h3>
        <div className="mt-4 space-y-3">
          {certificates.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-ink">{item.title}</div>
              <div className="mt-1 text-sm text-slate-500">{item.issuer}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-5">
        <h3 className="text-lg font-semibold text-ink">{copy.portfolio.items}</h3>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-ink">{item.title}</div>
              <div className="mt-1 text-sm capitalize text-slate-500">{item.type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
