import { getScheduleDayLabels } from "@/lib/schedule/copy";

function FilterFields({
  copy,
  classes,
  teachers,
  rooms,
  days,
  selected
}: {
  copy: {
    apply: string;
    classLabel: string;
    teacherLabel: string;
    roomLabel: string;
    dayLabel: string;
    all: string;
    reset: string;
  };
  classes: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; user: { fullName: string } }>;
  rooms: Array<{ id: string; name: string }>;
  days: string[];
  selected?: {
    classId?: string | null;
    teacherId?: string | null;
    roomId?: string | null;
    dayOfWeek?: number | null;
  };
}) {
  return (
    <>
      <label className="space-y-2 text-sm">
        <span className="text-slate-500">{copy.classLabel}</span>
        <select
          name="classId"
          defaultValue={selected?.classId ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          <option value="">{copy.all}</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-slate-500">{copy.teacherLabel}</span>
        <select
          name="teacherId"
          defaultValue={selected?.teacherId ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          <option value="">{copy.all}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.user.fullName}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-slate-500">{copy.roomLabel}</span>
        <select
          name="roomId"
          defaultValue={selected?.roomId ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          <option value="">{copy.all}</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-slate-500">{copy.dayLabel}</span>
        <select
          name="dayOfWeek"
          defaultValue={selected?.dayOfWeek ? String(selected.dayOfWeek) : ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          <option value="">{copy.all}</option>
          {days.map((day, index) => (
            <option key={day} value={index + 1}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_auto]">
        <button className="w-full rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white">
          {copy.apply}
        </button>
        <a
          href="?"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          {copy.reset}
        </a>
      </div>
    </>
  );
}

export function ScheduleResponsiveFilters({
  locale,
  classes,
  teachers,
  rooms,
  selected
}: {
  locale: "ru" | "kz";
  classes: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; user: { fullName: string } }>;
  rooms: Array<{ id: string; name: string }>;
  selected?: {
    classId?: string | null;
    teacherId?: string | null;
    roomId?: string | null;
    dayOfWeek?: number | null;
  };
}) {
  const days = getScheduleDayLabels(locale);
  const copy =
    locale === "kz"
      ? {
          apply: "С?згіні ?олдану",
          classLabel: "Сынып",
          teacherLabel: "М??алім",
          roomLabel: "Кабинет",
          dayLabel: "К?н",
          all: "Барлы?ы",
          reset: "Тазалау",
          mobileTitle: "С?згілер",
          desktopTitle: "Кесте с?згілері",
          desktopHint: "Сынып, м??алім, кабинет немесе к?н бойынша к?ріністі тарылты?ыз.",
          activeFilters: "Белсенді с?згілер"
        }
      : {
          apply: "Применить",
          classLabel: "Класс",
          teacherLabel: "Учитель",
          roomLabel: "Кабинет",
          dayLabel: "День",
          all: "Все",
          reset: "Сбросить",
          mobileTitle: "Фильтры",
          desktopTitle: "Фильтры расписания",
          desktopHint: "Сузьте сетку по классу, учителю, кабинету или конкретному дню.",
          activeFilters: "Активные фильтры"
        };

  const activeFilterCount = [
    selected?.classId,
    selected?.teacherId,
    selected?.roomId,
    selected?.dayOfWeek
  ].filter(Boolean).length;

  return (
    <form className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:hidden">
        <details open={activeFilterCount > 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {copy.activeFilters}
              </div>
              <div className="mt-1 text-base font-semibold text-ink">{copy.mobileTitle}</div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {activeFilterCount}
            </span>
          </summary>
          <div className="mt-4 grid gap-3">
            <FilterFields
              copy={copy}
              classes={classes}
              teachers={teachers}
              rooms={rooms}
              days={days}
              selected={selected}
            />
          </div>
        </details>
      </section>

      <section className="hidden rounded-2xl border border-slate-200 bg-white p-4 md:block">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink">{copy.desktopTitle}</div>
            <p className="mt-1 text-sm text-slate-500">{copy.desktopHint}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {copy.activeFilters}: {activeFilterCount}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(220px,0.85fr)]">
          <FilterFields
            copy={copy}
            classes={classes}
            teachers={teachers}
            rooms={rooms}
            days={days}
            selected={selected}
          />
        </div>
      </section>
    </form>
  );
}

