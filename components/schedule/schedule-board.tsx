import { type Locale, getDictionary } from "@/lib/i18n";

export function ScheduleBoard({
  entries,
  locale
}: {
  entries: Array<{
    id: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    type: string;
    schoolClass?: { name: string } | null;
    room?: { name: string } | null;
    subject?: { name: string } | null;
    teacher?: { user: { fullName: string } } | null;
    isReplacement?: boolean;
  }>;
  locale: Locale;
}) {
  const copy = getDictionary(locale);
  const dayNames = copy.schedule.days;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((day) => (
        <div key={day} className="panel p-4">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{dayNames[day - 1]}</div>
          <div className="space-y-3">
            {entries
              .filter((entry) => entry.dayOfWeek === day)
              .map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-ink">{entry.title}</div>
                    {entry.isReplacement ? <span className="pill bg-warning/15 text-warning">{copy.schedule.replacement}</span> : null}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {entry.startTime} - {entry.endTime}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {entry.subject?.name ?? entry.schoolClass?.name} {entry.room ? ` • ${entry.room.name}` : ""}
                  </div>
                  {entry.teacher ? <div className="mt-1 text-xs text-slate-500">{entry.teacher.user.fullName}</div> : null}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
