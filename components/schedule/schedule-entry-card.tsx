import { ScheduleEntryType } from "@prisma/client";
import { getScheduleEntryTypeLabel } from "@/lib/schedule/copy";

export function ScheduleEntryCard({
  locale,
  entry
}: {
  locale: "ru" | "kz";
  entry: {
    id: string;
    title: string;
    type: ScheduleEntryType;
    schoolClass?: { name: string } | null;
    teacher?: { user: { fullName: string } } | null;
    room?: { name: string } | null;
    durationSlots?: number | null;
    isReplacement?: boolean;
    status?: string;
  };
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="font-medium text-ink">{entry.title}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">
        {getScheduleEntryTypeLabel(locale, entry.type)}
      </div>
      <div className="mt-2 text-sm text-slate-600">
        {entry.schoolClass?.name ?? "—"}
        {entry.room?.name ? ` • ${entry.room.name}` : ""}
      </div>
      {entry.teacher?.user.fullName ? <div className="mt-1 text-xs text-slate-500">{entry.teacher.user.fullName}</div> : null}
      {entry.durationSlots && entry.durationSlots > 1 ? (
        <div className="mt-1 text-xs text-slate-500">
          {locale === "kz" ? `${entry.durationSlots} слот` : `${entry.durationSlots} слота`}
        </div>
      ) : null}
      {entry.isReplacement ? (
        <div className="mt-2 inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
          {locale === "kz" ? "Ауыстыру" : "Замена"}
        </div>
      ) : null}
    </div>
  );
}
