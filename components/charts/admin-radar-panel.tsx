"use client";

export function AdminRadarPanel({
  title,
  data,
  dataKey
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
}) {
  const labelKey = Object.keys(data[0] ?? {}).find((key) => key !== dataKey) ?? "label";
  const topValue = Math.max(...data.map((item) => Number(item[dataKey] ?? 0)), 1);

  return (
    <div className="panel p-5">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.length ? (
          data.map((item) => {
            const label = String(item[labelKey] ?? "—");
            const value = Number(item[dataKey] ?? 0);
            const width = Math.max((value / topValue) * 100, value > 0 ? 10 : 0);

            return (
              <div key={`${label}-${value}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{label}</span>
                  <span className="text-slate-500">{Math.round(value)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-royal/80" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
            Нет данных
          </div>
        )}
      </div>
    </div>
  );
}
