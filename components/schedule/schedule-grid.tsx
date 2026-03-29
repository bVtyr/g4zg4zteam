import { getScheduleDayLabels } from "@/lib/schedule/copy";
import { ScheduleEntryCard } from "@/components/schedule/schedule-entry-card";

export function ScheduleGrid({
  locale,
  entries,
  timeSlots
}: {
  locale: "ru" | "kz";
  entries: Array<{
    id: string;
    title: string;
    type: any;
    dayOfWeek: number;
    slotNumber: number | null;
    slotIndex: number | null;
    durationSlots: number | null;
    isReplacement: boolean;
    status: string;
    schoolClass: { name: string } | null;
    teacher: { user: { fullName: string } } | null;
    room: { name: string } | null;
  }>;
  timeSlots: Array<{
    slotNumber: number;
    startTime: string;
    endTime: string;
  }>;
}) {
  const days = getScheduleDayLabels(locale);
  const slotLabel = locale === "kz" ? "Слот" : "Слот";
  const emptyLabel = locale === "kz" ? "Сабақ жоқ" : "Нет занятия";

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <th className="sticky left-0 z-10 w-32 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">{slotLabel}</th>
            {days.map((day) => (
              <th key={day} className="border-b border-slate-200 px-3 py-3">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => (
            <tr key={slot.slotNumber}>
              <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-white px-3 py-3 align-top text-slate-600">
                <div className="font-semibold text-ink">№ {slot.slotNumber}</div>
                <div>{slot.startTime}</div>
                <div>{slot.endTime}</div>
              </td>
              {days.map((_, dayIndex) => {
                const dayOfWeek = dayIndex + 1;
                const slotEntries = entries.filter(
                  (entry) => entry.dayOfWeek === dayOfWeek && (entry.slotNumber ?? entry.slotIndex ?? 0) === slot.slotNumber
                );
                return (
                  <td key={`${dayOfWeek}-${slot.slotNumber}`} className="min-w-[220px] border-b border-slate-200 p-2 align-top">
                    <div className="space-y-2">
                      {slotEntries.length ? (
                        slotEntries.map((entry) => <ScheduleEntryCard key={entry.id} locale={locale} entry={entry} />)
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                          {emptyLabel}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
