import { getScheduleDayLabels, getScheduleEntryTypeLabel } from "@/lib/schedule/copy";
import { cn } from "@/lib/utils";

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
  subject?: { name: string } | null;
  teacher?: { user: { fullName: string } } | null;
  room?: { name: string } | null;
  conflicts?: Array<{ message: string }>;
};

type BoardMode = "admin" | "kiosk";

function getEntryStartSlot(entry: GridEntry) {
  return entry.slotNumber ?? entry.slotIndex ?? 1;
}

function getSlotEntries(entries: GridEntry[], dayOfWeek: number, slotNumber: number) {
  return entries.filter(
    (entry) => entry.dayOfWeek === dayOfWeek && getEntryStartSlot(entry) === slotNumber
  );
}

function getContinuedEntries(entries: GridEntry[], dayOfWeek: number, slotNumber: number) {
  return entries.filter((entry) => {
    const startSlot = getEntryStartSlot(entry);
    const duration = entry.durationSlots ?? 1;
    return (
      entry.dayOfWeek === dayOfWeek &&
      startSlot < slotNumber &&
      startSlot + duration - 1 >= slotNumber
    );
  });
}

function getEntryBadges(entry: GridEntry, locale: "ru" | "kz", mode: BoardMode) {
  if (mode === "kiosk") {
    return [];
  }

  const badges: Array<{ key: string; label: string; className: string }> = [];

  if (entry.isLocked) {
    badges.push({
      key: "locked",
      label: "Locked",
      className: "bg-danger/[0.08] text-danger"
    });
  }

  if (entry.isManualOverride) {
    badges.push({
      key: "manual",
      label: "Manual",
      className: "bg-warning/[0.12] text-warning"
    });
  }

  if (entry.isGenerated) {
    badges.push({
      key: "generated",
      label: "Generated",
      className: "bg-royal/[0.08] text-royal"
    });
  }

  if (entry.conflicts?.length) {
    badges.push({
      key: "conflict",
      label:
        locale === "kz"
          ? `Қақтығыс ${entry.conflicts.length}`
          : `Конфликт ${entry.conflicts.length}`,
      className: "bg-danger/[0.12] text-danger"
    });
  }

  return badges;
}

function renderEntryCard(
  entry: GridEntry,
  locale: "ru" | "kz",
  mode: BoardMode
) {
  const badges = getEntryBadges(entry, locale, mode);
  const secondaryLine = [
    entry.schoolClass?.name ?? null,
    entry.teacher?.user.fullName ?? null,
    entry.room?.name ?? null
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <article
      key={entry.id}
      className={cn(
        "rounded-xl border",
        mode === "kiosk"
          ? "border-white/10 bg-white/5 p-4 text-white"
          : entry.conflicts?.length
            ? "border-danger/30 bg-danger/[0.03] p-3"
            : "border-slate-200 bg-white p-3"
      )}
    >
      {badges.length ? (
        <div className="flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span
              key={badge.key}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "font-semibold",
          mode === "kiosk" ? "mt-0 text-lg leading-6 text-white xl:text-xl" : "mt-2 text-ink"
        )}
      >
        {entry.title}
      </div>
      <div
        className={cn(
          "mt-1 uppercase tracking-[0.08em]",
          mode === "kiosk" ? "text-[11px] text-white/55" : "text-[11px] text-slate-500"
        )}
      >
        {getScheduleEntryTypeLabel(locale, entry.type)}
      </div>
      {secondaryLine ? (
        <div
          className={cn(
            "mt-2",
            mode === "kiosk" ? "text-sm leading-6 text-white/80 xl:text-base" : "text-sm text-slate-600"
          )}
        >
          {secondaryLine}
        </div>
      ) : null}
      {entry.durationSlots && entry.durationSlots > 1 ? (
        <div
          className={cn(
            "mt-1 text-xs",
            mode === "kiosk" ? "text-white/55" : "text-slate-500"
          )}
        >
          {locale === "kz"
            ? `${entry.durationSlots} слот`
            : `${entry.durationSlots} слота`}
        </div>
      ) : null}
      {mode === "admin" && entry.conflicts?.length ? (
        <div className="mt-2 text-xs text-danger">
          {entry.conflicts.map((conflict) => conflict.message).join(" / ")}
        </div>
      ) : null}
    </article>
  );
}

export function ScheduleResponsiveGrid({
  locale,
  entries,
  timeSlots,
  mode = "admin",
  focusDay = null,
  highlightedSlot = null
}: {
  locale: "ru" | "kz";
  entries: GridEntry[];
  timeSlots: Array<{
    slotNumber: number;
    startTime: string;
    endTime: string;
  }>;
  mode?: BoardMode;
  focusDay?: number | null;
  highlightedSlot?: {
    dayOfWeek: number;
    slotNumber: number | null;
  } | null;
}) {
  const dayLabels = getScheduleDayLabels(locale);
  const days = dayLabels
    .map((label, index) => ({
      label,
      dayOfWeek: index + 1
    }))
    .filter((day) => (focusDay ? day.dayOfWeek === focusDay : true));
  const emptyLabel = locale === "kz" ? "Бос" : "Пусто";
  const continuedLabel = locale === "kz" ? "Жалғасуы" : "Продолжение";
  const showEmptySlotsOnMobile = mode === "kiosk" || Boolean(focusDay);

  return (
    <div className="space-y-4">
      <div className="space-y-4 md:hidden">
        {days.map((day) => {
          const visibleSlots = showEmptySlotsOnMobile
            ? timeSlots
            : timeSlots.filter((slot) => {
                const slotEntries = getSlotEntries(entries, day.dayOfWeek, slot.slotNumber);
                const continuedEntries = getContinuedEntries(entries, day.dayOfWeek, slot.slotNumber);
                return slotEntries.length > 0 || continuedEntries.length > 0;
              });

          return (
            <section
              key={day.dayOfWeek}
              className={cn(
                "overflow-hidden rounded-2xl border",
                mode === "kiosk"
                  ? "border-white/10 bg-[#0f1a3a] text-white"
                  : "border-slate-200 bg-white"
              )}
            >
              <div
                className={cn(
                  "px-4 py-3 font-semibold",
                  mode === "kiosk"
                    ? "border-b border-white/10 text-lg text-white"
                    : "border-b border-slate-200 text-ink"
                )}
              >
                {day.label}
              </div>
              <div className="space-y-3 p-3">
                {visibleSlots.length ? (
                  visibleSlots.map((slot) => {
                    const slotEntries = getSlotEntries(entries, day.dayOfWeek, slot.slotNumber);
                    const continuedEntries = getContinuedEntries(entries, day.dayOfWeek, slot.slotNumber);
                    const isHighlighted =
                      highlightedSlot?.dayOfWeek === day.dayOfWeek &&
                      highlightedSlot?.slotNumber === slot.slotNumber;

                    return (
                      <div
                        key={`${day.dayOfWeek}-${slot.slotNumber}`}
                        className={cn(
                          "rounded-xl border p-3",
                          mode === "kiosk"
                            ? isHighlighted
                              ? "border-amber-300/40 bg-amber-300/10"
                              : "border-white/10 bg-white/[0.03]"
                            : isHighlighted
                              ? "border-amber-300 bg-amber-50"
                              : "border-slate-200 bg-slate-50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-between gap-3",
                            mode === "kiosk" ? "text-white" : "text-ink"
                          )}
                        >
                          <div className="font-semibold">#{slot.slotNumber}</div>
                          <div
                            className={cn(
                              "text-xs",
                              mode === "kiosk" ? "text-white/65" : "text-slate-500"
                            )}
                          >
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {slotEntries.map((entry) => renderEntryCard(entry, locale, mode))}
                          {!slotEntries.length && continuedEntries.length ? (
                            <div
                              className={cn(
                                "rounded-xl border border-dashed px-3 py-3 text-xs",
                                mode === "kiosk"
                                  ? "border-white/15 text-white/70"
                                  : "border-slate-200 text-slate-500"
                              )}
                            >
                              {continuedLabel}: {continuedEntries.map((entry) => entry.title).join(" / ")}
                            </div>
                          ) : null}
                          {!slotEntries.length && !continuedEntries.length ? (
                            <div
                              className={cn(
                                "rounded-xl border border-dashed px-3 py-3 text-sm",
                                mode === "kiosk"
                                  ? "border-white/10 text-white/45"
                                  : "border-slate-200 text-slate-400"
                              )}
                            >
                              {emptyLabel}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className={cn(
                      "rounded-xl border border-dashed px-3 py-4 text-sm",
                      mode === "kiosk"
                        ? "border-white/10 text-white/45"
                        : "border-slate-200 text-slate-400"
                    )}
                  >
                    {emptyLabel}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div
        className={cn(
          "hidden overflow-x-auto rounded-2xl border md:block",
          mode === "kiosk" ? "border-white/10 bg-[#0f1a3a]" : "border-slate-200 bg-white"
        )}
      >
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr
              className={cn(
                "text-left text-xs uppercase tracking-[0.08em]",
                mode === "kiosk" ? "text-white/55" : "text-slate-500"
              )}
            >
              <th
                className={cn(
                  "sticky left-0 top-0 z-30 w-36 border-b border-r px-3 py-3",
                  mode === "kiosk"
                    ? "border-white/10 bg-[#10204a]"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                Slot
              </th>
              {days.map((day) => (
                <th
                  key={day.dayOfWeek}
                  className={cn(
                    "sticky top-0 z-20 border-b px-3 py-3",
                    mode === "kiosk"
                      ? "border-white/10 bg-[#10204a] text-base font-semibold text-white xl:text-lg"
                      : "border-slate-200 bg-slate-50"
                  )}
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => (
              <tr key={slot.slotNumber}>
                <td
                  className={cn(
                    "sticky left-0 z-10 border-r border-b px-3 py-3 align-top",
                    highlightedSlot?.slotNumber === slot.slotNumber
                      ? mode === "kiosk"
                        ? "border-amber-300/20 bg-[#162858]"
                        : "border-slate-200 bg-amber-50"
                      : mode === "kiosk"
                        ? "border-white/10 bg-[#0f1a3a]"
                        : "border-slate-200 bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "font-semibold",
                      mode === "kiosk" ? "text-lg text-white xl:text-xl" : "text-ink"
                    )}
                  >
                    #{slot.slotNumber}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs",
                      mode === "kiosk" ? "text-white/60" : "text-slate-500"
                    )}
                  >
                    {slot.startTime}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      mode === "kiosk" ? "text-white/60" : "text-slate-500"
                    )}
                  >
                    {slot.endTime}
                  </div>
                </td>
                {days.map((day) => {
                  const slotEntries = getSlotEntries(entries, day.dayOfWeek, slot.slotNumber);
                  const continuedEntries = getContinuedEntries(entries, day.dayOfWeek, slot.slotNumber);
                  const isHighlighted =
                    highlightedSlot?.dayOfWeek === day.dayOfWeek &&
                    highlightedSlot?.slotNumber === slot.slotNumber;

                  return (
                    <td
                      key={`${day.dayOfWeek}-${slot.slotNumber}`}
                      className={cn(
                        "align-top",
                        mode === "kiosk"
                          ? "min-w-[280px] border-b border-white/10 p-3 xl:min-w-[320px]"
                          : "min-w-[210px] border-b border-slate-200 p-2 xl:min-w-[240px]"
                      )}
                    >
                      <div
                        className={cn(
                          "space-y-2 rounded-xl",
                          isHighlighted &&
                            (mode === "kiosk"
                              ? "bg-amber-300/10 p-2"
                              : "bg-amber-50/80 p-1")
                        )}
                      >
                        {slotEntries.map((entry) => renderEntryCard(entry, locale, mode))}
                        {!slotEntries.length && continuedEntries.length ? (
                          <div
                            className={cn(
                              "rounded-xl border border-dashed px-3 py-3 text-xs",
                              mode === "kiosk"
                                ? "border-white/15 text-white/70"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            )}
                          >
                            {continuedLabel}: {continuedEntries.map((entry) => entry.title).join(" / ")}
                          </div>
                        ) : null}
                        {!slotEntries.length && !continuedEntries.length ? (
                          <div
                            className={cn(
                              "rounded-xl border border-dashed px-3 py-4 text-sm",
                              mode === "kiosk"
                                ? "border-white/10 text-white/40"
                                : "border-slate-200 text-slate-400"
                            )}
                          >
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
    </div>
  );
}
