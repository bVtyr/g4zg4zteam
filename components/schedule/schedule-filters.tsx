import { getScheduleDayLabels } from "@/lib/schedule/copy";

export function ScheduleFilters({
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
          apply: "Сүзгіні қолдану",
          classLabel: "Сынып",
          teacherLabel: "Мұғалім",
          roomLabel: "Кабинет",
          dayLabel: "Күн",
          all: "Барлығы"
        }
      : {
          apply: "Применить фильтры",
          classLabel: "Класс",
          teacherLabel: "Учитель",
          roomLabel: "Кабинет",
          dayLabel: "День",
          all: "Все"
        };

  return (
    <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 xl:grid-cols-5">
      <label className="space-y-2 text-sm">
        <span className="text-slate-500">{copy.classLabel}</span>
        <select name="classId" defaultValue={selected?.classId ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
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
        <select name="teacherId" defaultValue={selected?.teacherId ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
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
        <select name="roomId" defaultValue={selected?.roomId ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
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
        <select name="dayOfWeek" defaultValue={selected?.dayOfWeek ? String(selected.dayOfWeek) : ""} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
          <option value="">{copy.all}</option>
          {days.map((day, index) => (
            <option key={day} value={index + 1}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button className="w-full rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white">{copy.apply}</button>
      </div>
    </form>
  );
}
