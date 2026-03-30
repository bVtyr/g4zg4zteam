import { getScheduleDayLabels, getScheduleEntryTypeLabel } from "@/lib/schedule/copy";

type GridEntry = {
  id: string;
  title: string;
  type: any;
  dayOfWeek: number;
  slotNumber: number | null;
  slotIndex: number | null;
  durationSlots: number | null;
  isLocked?: boolean;
  isManualOverride?: boolean;
  isGenerated?: boolean;
  schoolClass?: { name: string } | null;
  teacher?: { user: { fullName: string } } | null;
  room?: { name: string } | null;
  conflicts?: Array<{ message: string }>;
};

function getEntryBadges(entry: GridEntry, locale: "ru" | "kz") {
  const badges: Array<{ key: string; label: string; className: string }> = [];

  if (entry.isLocked) {
    badges.push({
      key: "locked",
      label: locale === "kz" ? "Locked" : "Locked",
      className: "bg-danger/[0.08] text-danger"
    });
  }

  if (entry.isManualOverride) {
    badges.push({
      key: "manual",
      label: locale === "kz" ? "Manual" : "Manual",
      className: "bg-warning/[0.12] text-warning"
    });
  }

  if (entry.isGenerated) {
    badges.push({
      key: "generated",
      label: locale === "kz" ? "Generated" : "Generated",
      className: "bg-royal/[0.08] text-royal"
    });
  }

  if (entry.conflicts?.length) {
    badges.push({
      key: "conflict",
      label: locale === "kz" ? `Conflict ${entry.conflicts.length}` : `Conflict ${entry.conflicts.length}`,
      className: "bg-danger/[0.12] text-danger"
    });
  }

  return badges;
}

export function ScheduleGridBoard({
  locale,
  entries,
  timeSlots
}: {
  locale: "ru" | "kz";
  entries: GridEntry[];
  timeSlots: Array<{
    slotNumber: number;
    startTime: string;
    endTime: string;
  }>;
}) {
  const days = getScheduleDayLabels(locale);
  const emptyLabel = locale === "kz" ? "Бос" : "Пусто";
  const continuedLabel = locale === "kz" ? "Жалғасы" : "Продолжение";

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <th className="sticky left-0 top-0 z-30 w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">
              Slot
            </th>
            {days.map((day) => (
              <th key={day} className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-3">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => (
            <tr key={slot.slotNumber}>
              <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-white px-3 py-3 align-top">
                <div className="font-semibold text-ink">#{slot.slotNumber}</div>
                <div className="mt-1 text-xs text-slate-500">{slot.startTime}</div>
                <div className="text-xs text-slate-500">{slot.endTime}</div>
              </td>
              {days.map((_, dayIndex) => {
                const dayOfWeek = dayIndex + 1;
                const slotEntries = entries.filter(
                  (entry) => entry.dayOfWeek === dayOfWeek && (entry.slotNumber ?? entry.slotIndex ?? 1) === slot.slotNumber
                );
                const continuedEntries = entries.filter((entry) => {
                  const startSlot = entry.slotNumber ?? entry.slotIndex ?? 1;
                  const duration = entry.durationSlots ?? 1;
                  return (
                    entry.dayOfWeek === dayOfWeek &&
                    startSlot < slot.slotNumber &&
                    startSlot + duration - 1 >= slot.slotNumber
                  );
                });

                return (
                  <td key={`${dayOfWeek}-${slot.slotNumber}`} className="min-w-[240px] border-b border-slate-200 p-2 align-top">
                    <div className="space-y-2">
                      {slotEntries.map((entry) => {
                        const badges = getEntryBadges(entry, locale);
                        return (
                          <article
                            key={entry.id}
                            className={`rounded-xl border p-3 ${
                              entry.conflicts?.length ? "border-danger/30 bg-danger/[0.03]" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex flex-wrap gap-1">
                              {badges.map((badge) => (
                                <span key={badge.key} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 font-semibold text-ink">{entry.title}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                              {getScheduleEntryTypeLabel(locale, entry.type)}
                            </div>
                            {entry.schoolClass?.name ? (
                              <div className="mt-2 text-sm font-medium text-slate-700">{entry.schoolClass.name}</div>
                            ) : null}
                            <div className="mt-2 text-sm text-slate-600">
                              {entry.teacher?.user.fullName ?? "—"}
                              {entry.room?.name ? ` • ${entry.room.name}` : ""}
                            </div>
                            {entry.durationSlots && entry.durationSlots > 1 ? (
                              <div className="mt-1 text-xs text-slate-500">
                                {locale === "kz" ? `${entry.durationSlots} слот` : `${entry.durationSlots} слота`}
                              </div>
                            ) : null}
                            {entry.conflicts?.length ? (
                              <div className="mt-2 text-xs text-danger">
                                {entry.conflicts.map((conflict) => conflict.message).join(" • ")}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}

                      {!slotEntries.length && continuedEntries.length ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                          {continuedLabel}: {continuedEntries.map((entry) => entry.title).join(" • ")}
                        </div>
                      ) : null}

                      {!slotEntries.length && !continuedEntries.length ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                          {emptyLabel}
                        </div>
                      ) : null}
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
