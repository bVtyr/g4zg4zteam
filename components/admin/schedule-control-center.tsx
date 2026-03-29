"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CalendarClock, Plus, RefreshCcw, Wand2 } from "lucide-react";
import { ScheduleEntryType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { SLOT_TEMPLATES } from "@/lib/schedule/slot-templates";
import { cn } from "@/lib/utils";

type ScheduleData = {
  stats: {
    totalEntries: number;
    replacements: number;
    streams: number;
    pairs: number;
    events: number;
    conflicts: number;
  };
  conflicts: Array<{
    type: "teacher" | "room" | "class" | "group" | "availability" | "room_suitability";
    dayOfWeek: number;
    slotIndex: number;
    startTime: string;
    endTime: string;
    message: string;
  }>;
  entries: Array<{
    id: string;
    title: string;
    type: ScheduleEntryType;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    effectiveDate: string | Date;
    notes: string | null;
    isReplacement: boolean;
    ribbonId?: string | null;
    classId: string | null;
    className: string | null;
    classGroupId?: string | null;
    subjectId: string | null;
    subjectName: string | null;
    teacherId: string | null;
    teacherName: string | null;
    roomId: string | null;
    roomName: string | null;
    slotIndex?: number | null;
    durationSlots?: number | null;
  }>;
  teachers: Array<{
    id: string;
    fullName: string;
    assignmentCount: number;
    assignments: Array<{
      id: string;
      className: string;
      subjectName: string;
    }>;
  }>;
  rooms: Array<{
    id: string;
    name: string;
  }>;
  classes: Array<{
    id: string;
    name: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
  }>;
  changeLogs: Array<{
    id: string;
    reason: string;
    affectedDate: string | Date;
    notes: string | null;
    previousTeacherId: string | null;
    replacementTeacherId: string | null;
    entryTitle: string;
    className: string | null;
    subjectName: string | null;
    newDayOfWeek?: number | null;
    newSlotIndex?: number | null;
    ribbonId?: string | null;
  }>;
  ribbons?: Array<{
    id: string;
    title: string;
    strict: boolean;
    dayOfWeek: number | null;
    slotIndex: number | null;
    items: Array<{
      id: string;
      title: string;
      className: string;
      groupName: string | null;
      subjectName: string | null;
      teacherName: string | null;
    }>;
  }>;
  absences?: Array<{
    id: string;
    teacherName: string;
    startsAt: string | Date;
    endsAt: string | Date;
    reason: string | null;
  }>;
};

const copy = {
  ru: {
    title: "Smart Schedule Control",
    subtitle: "Генерация, пересборка, конфликты, ручное добавление и журнал замен в одном центре управления.",
    generate: "Сгенерировать расписание",
    regenerate: "Пересчитать из-за отсутствия",
    manual: "Добавить вручную",
    snapshot: "Текущее полотно расписания",
    ribbons: "Strict ribbons",
    absences: "Последние absence-сценарии",
    conflicts: "Конфликты",
    changes: "Последние перестройки",
    teacher: "Учитель",
    date: "Дата",
    reason: "Причина",
    classLabel: "Класс",
    subject: "Предмет",
    room: "Кабинет",
    type: "Тип",
    titleLabel: "Название",
    day: "День",
    start: "Начало",
    end: "Конец",
    effectiveDate: "Дата вступления",
    notes: "Комментарий",
    noConflicts: "Конфликтов не найдено",
    noChanges: "Журнал перестроений пока пуст",
    noEntries: "Записей расписания пока нет",
    total: "Всего записей",
    replacements: "Замены",
    streams: "Ленты",
    pairs: "Пары",
    events: "События",
    failed: "Не удалось выполнить действие.",
    successGenerate: "Расписание сгенерировано.",
    successRegenerate: "Перестройка выполнена.",
    successManual: "Запись расписания добавлена.",
    confirmAuto: "Подтвердить авто-перестройку",
    confirmAutoText: "Система создаст TeacherAbsence, найдёт affected entries, попробует substitute teacher и затем перенесёт unresolved блоки.",
    apply: "Применить",
    cancel: "Отмена",
    dayNames: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    replacement: "замена"
  },
  kz: {
    title: "Smart Schedule Control",
    subtitle: "Генерация, қайта құру, конфликттер, қолмен қосу және ауыстыру журналы бір басқару орталығында.",
    generate: "Кестені генерациялау",
    regenerate: "Мұғалім болмауына байланысты қайта құру",
    manual: "Қолмен қосу",
    snapshot: "Ағымдағы кесте көрінісі",
    ribbons: "Strict ribbons",
    absences: "Соңғы absence-сценарийлер",
    conflicts: "Конфликттер",
    changes: "Соңғы қайта құрулар",
    teacher: "Мұғалім",
    date: "Күні",
    reason: "Себеп",
    classLabel: "Сынып",
    subject: "Пән",
    room: "Кабинет",
    type: "Түрі",
    titleLabel: "Атауы",
    day: "Күн",
    start: "Басталуы",
    end: "Аяқталуы",
    effectiveDate: "Күшіне ену күні",
    notes: "Түсіндірме",
    noConflicts: "Конфликт табылмады",
    noChanges: "Қайта құру журналы әлі бос",
    noEntries: "Кесте жазбалары әлі жоқ",
    total: "Жалпы жазба",
    replacements: "Ауыстырулар",
    streams: "Ленталар",
    pairs: "Қос сабақ",
    events: "Іс-шаралар",
    failed: "Әрекетті орындау мүмкін болмады.",
    successGenerate: "Кесте генерацияланды.",
    successRegenerate: "Қайта құру орындалды.",
    successManual: "Кесте жазбасы қосылды.",
    confirmAuto: "Авто-қайта құруды растау",
    confirmAutoText: "Жүйе TeacherAbsence жасайды, affected entries табады, substitute teacher іздейді және unresolved блоктарды көшіреді.",
    apply: "Қолдану",
    cancel: "Болдырмау",
    dayNames: ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"],
    replacement: "ауыстыру"
  }
} as const;

const typeLabels: Record<Locale, Partial<Record<ScheduleEntryType, string>>> = {
  ru: {
    lesson: "урок",
    pair: "пара",
    academic_hour: "академ. час",
    event: "событие",
    stream: "лента",
    ribbon: "лента"
  },
  kz: {
    lesson: "сабақ",
    pair: "қос сабақ",
    academic_hour: "акад. сағат",
    event: "іс-шара",
    stream: "лента",
    ribbon: "лента"
  }
};

function formatDate(locale: Locale, value: string | Date) {
  return new Intl.DateTimeFormat(locale === "kz" ? "kk-KZ" : "ru-RU", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function ScheduleControlCenter({
  locale,
  data,
  showHeader = true
}: {
  locale: Locale;
  data: ScheduleData;
  showHeader?: boolean;
}) {
  const t = copy[locale];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [teacherId, setTeacherId] = useState(data.teachers[0]?.id ?? "");
  const [affectedDate, setAffectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [absenceReason, setAbsenceReason] = useState("");
  const [entryFilterDay, setEntryFilterDay] = useState("all");
  const [entryFilterClass, setEntryFilterClass] = useState("all");
  const [confirmRecalculateOpen, setConfirmRecalculateOpen] = useState(false);
  const [manualForm, setManualForm] = useState<{
    title: string;
    type: ScheduleEntryType;
    classId: string;
    subjectId: string;
    teacherId: string;
    roomId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    effectiveDate: string;
    notes: string;
  }>({
    title: "",
    type: ScheduleEntryType.lesson,
    classId: data.classes[0]?.id ?? "",
    subjectId: data.subjects[0]?.id ?? "",
    teacherId: data.teachers[0]?.id ?? "",
    roomId: data.rooms[0]?.id ?? "",
    dayOfWeek: "1",
    startTime: "08:00",
    endTime: "08:45",
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  const filteredEntries = useMemo(() => {
    return data.entries.filter((entry) => {
      const matchesDay = entryFilterDay === "all" || String(entry.dayOfWeek) === entryFilterDay;
      const matchesClass = entryFilterClass === "all" || entry.classId === entryFilterClass;
      return matchesDay && matchesClass;
    });
  }, [data.entries, entryFilterClass, entryFilterDay]);

  async function handleAction(
    action: () => Promise<Response>,
    successText: string
  ) {
    setFeedback(null);
    const response = await action();
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        payload?.conflicts?.[0]?.message ??
        payload?.error ??
        t.failed;
      setFeedback({ tone: "error", text: String(detail) });
      return;
    }

    setFeedback({ tone: "success", text: successText });
    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-6">
      <div className="panel p-5">
        {showHeader ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-ink">{t.title}</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{t.subtitle}</p>
            </div>
            {feedback ? (
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm",
                  feedback.tone === "success" ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
                )}
              >
                {feedback.text}
              </div>
            ) : null}
          </div>
        ) : (
          feedback ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm",
                feedback.tone === "success" ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
              )}
            >
              {feedback.text}
            </div>
          ) : null
        )}

        <div className={cn(showHeader ? "mt-5" : "", "grid gap-4 md:grid-cols-3 xl:grid-cols-6")}>
          {[
            [t.total, data.stats.totalEntries],
            [t.replacements, data.stats.replacements],
            [t.streams, data.stats.streams],
            [t.pairs, data.stats.pairs],
            [t.events, data.stats.events],
            [t.conflicts, data.stats.conflicts]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-royal" />
            <h4 className="text-lg font-semibold text-ink">{t.generate}</h4>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {locale === "kz"
              ? "Teaching assignment және teacher availability негізінде conflict-free бастапқы кесте құрылады."
              : "На основе teaching assignments и teacher availability строится базовое conflict-free расписание."}
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-royal px-4 py-3 text-sm font-semibold text-white"
            disabled={isPending}
            onClick={() =>
              handleAction(
                () =>
                  fetch("/api/admin/schedule/generate", {
                    method: "POST"
                  }),
                t.successGenerate
              )
            }
          >
            <Wand2 className="h-4 w-4" />
            {t.generate}
          </button>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-5 w-5 text-warning" />
            <h4 className="text-lg font-semibold text-ink">{t.regenerate}</h4>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-500">{t.teacher}</span>
              <select
                className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
              >
                {data.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-500">{t.date}</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                value={affectedDate}
                onChange={(event) => setAffectedDate(event.target.value)}
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2 text-sm">
            <span className="text-slate-500">{t.reason}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={absenceReason}
              onChange={(event) => setAbsenceReason(event.target.value)}
              placeholder={locale === "kz" ? "Мұғалімнің болмау себебі" : "Причина отсутствия учителя"}
            />
          </label>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-warning px-4 py-3 text-sm font-semibold text-white"
            disabled={isPending || !teacherId || !affectedDate}
            onClick={() => setConfirmRecalculateOpen(true)}
          >
            <CalendarClock className="h-4 w-4" />
            {t.regenerate}
          </button>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <Plus className="h-5 w-5 text-aqua" />
          <h4 className="text-lg font-semibold text-ink">{t.manual}</h4>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.titleLabel}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.title}
              onChange={(event) => setManualForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.type}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.type}
              onChange={(event) =>
                setManualForm((current) => ({ ...current, type: event.target.value as ScheduleEntryType }))
              }
            >
              {Object.values(ScheduleEntryType).map((type) => (
                <option key={type} value={type}>
                  {typeLabels[locale][type] ?? type}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.classLabel}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.classId}
              onChange={(event) => setManualForm((current) => ({ ...current, classId: event.target.value }))}
            >
              {data.classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.subject}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.subjectId}
              onChange={(event) => setManualForm((current) => ({ ...current, subjectId: event.target.value }))}
            >
              {data.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.teacher}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.teacherId}
              onChange={(event) => setManualForm((current) => ({ ...current, teacherId: event.target.value }))}
            >
              {data.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.room}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.roomId}
              onChange={(event) => setManualForm((current) => ({ ...current, roomId: event.target.value }))}
            >
              {data.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.day}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.dayOfWeek}
              onChange={(event) => setManualForm((current) => ({ ...current, dayOfWeek: event.target.value }))}
            >
              {t.dayNames.map((day, index) => (
                <option key={day} value={index + 1}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.effectiveDate}</span>
            <input
              type="date"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.effectiveDate}
              onChange={(event) => setManualForm((current) => ({ ...current, effectiveDate: event.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.start}</span>
            <input
              type="time"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.startTime}
              onChange={(event) => setManualForm((current) => ({ ...current, startTime: event.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-500">{t.end}</span>
            <input
              type="time"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.endTime}
              onChange={(event) => setManualForm((current) => ({ ...current, endTime: event.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2 xl:col-span-2">
            <span className="text-slate-500">{t.notes}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              value={manualForm.notes}
              onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-aqua px-4 py-3 text-sm font-semibold text-ink"
          disabled={isPending || !manualForm.title}
          onClick={() =>
            handleAction(
              () =>
                fetch("/api/admin/schedule/manual-entry", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    ...manualForm,
                    dayOfWeek: Number(manualForm.dayOfWeek)
                  })
                }),
              t.successManual
            )
          }
        >
          <Plus className="h-4 w-4" />
          {t.manual}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn("h-5 w-5", data.conflicts.length ? "text-danger" : "text-success")} />
            <h4 className="text-lg font-semibold text-ink">{t.conflicts}</h4>
          </div>
          <div className="mt-4 space-y-3">
            {data.conflicts.length ? (
              data.conflicts.map((conflict, index) => (
                <div key={`${conflict.message}-${index}`} className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
                  <div className="font-medium">{conflict.type}</div>
                  <div className="mt-1">
                    {t.dayNames[conflict.dayOfWeek - 1]} • {conflict.startTime} - {conflict.endTime}
                  </div>
                  <div className="mt-1 text-danger/90">{conflict.message}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-success/10 p-4 text-sm text-success">{t.noConflicts}</div>
            )}
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-semibold text-ink">{t.changes}</h4>
            <div className="mt-4 space-y-3">
              {data.changeLogs.length ? (
                data.changeLogs.map((change) => (
                  <div key={change.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-medium text-ink">{change.entryTitle}</div>
                    <div className="mt-1 text-slate-500">
                      {formatDate(locale, change.affectedDate)}
                      {change.className ? ` • ${change.className}` : ""}
                      {change.subjectName ? ` • ${change.subjectName}` : ""}
                    </div>
                    <div className="mt-1 text-slate-600">{change.notes ?? change.reason}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{t.noChanges}</div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-semibold text-ink">{t.ribbons}</h4>
            <div className="mt-4 space-y-3">
              {data.ribbons?.length ? (
                data.ribbons.map((ribbon) => (
                  <div key={ribbon.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-medium text-ink">{ribbon.title}</div>
                    <div className="mt-1 text-slate-500">
                      strict • {ribbon.dayOfWeek ? t.dayNames[ribbon.dayOfWeek - 1] : "—"} • slot {ribbon.slotIndex ?? "—"}
                    </div>
                    <div className="mt-2 space-y-1">
                      {ribbon.items.map((item) => (
                        <div key={item.id}>
                          {item.className}
                          {item.groupName ? ` / ${item.groupName}` : ""}
                          {item.subjectName ? ` • ${item.subjectName}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{t.noEntries}</div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-semibold text-ink">{t.absences}</h4>
            <div className="mt-4 space-y-3">
              {data.absences?.length ? (
                data.absences.map((absence) => (
                  <div key={absence.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-medium text-ink">{absence.teacherName}</div>
                    <div className="mt-1 text-slate-500">{formatDate(locale, absence.startsAt)}</div>
                    <div className="mt-1 text-slate-600">{absence.reason ?? "—"}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{t.noChanges}</div>
              )}
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold text-ink">{t.snapshot}</h4>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                value={entryFilterDay}
                onChange={(event) => setEntryFilterDay(event.target.value)}
              >
                <option value="all">{t.day}</option>
                {t.dayNames.map((day, index) => (
                  <option key={day} value={index + 1}>
                    {day}
                  </option>
                ))}
              </select>
              <select
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                value={entryFilterClass}
                onChange={(event) => setEntryFilterClass(event.target.value)}
              >
                <option value="all">{t.classLabel}</option>
                {data.classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            {filteredEntries.length ? (
              <table className="min-w-full border-separate border-spacing-2 text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-slate-500">Slot</th>
                    {t.dayNames.slice(0, 5).map((day) => (
                      <th key={day} className="px-2 py-2 text-left text-slate-500">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOT_TEMPLATES.map((slot) => (
                    <tr key={slot.slotIndex}>
                      <td className="align-top rounded-2xl bg-slate-50 px-3 py-3 text-slate-500">
                        <div className="font-medium text-ink">#{slot.slotIndex}</div>
                        <div>{slot.startTime}</div>
                        <div>{slot.endTime}</div>
                      </td>
                      {t.dayNames.slice(0, 5).map((_, dayIndex) => {
                        const dayOfWeek = dayIndex + 1;
                        const cellEntries = filteredEntries.filter((entry) => entry.dayOfWeek === dayOfWeek && (entry.slotIndex ?? 0) === slot.slotIndex);
                        return (
                          <td key={`${dayOfWeek}-${slot.slotIndex}`} className="min-w-[180px] align-top">
                            <div className="space-y-2">
                              {cellEntries.map((entry) => (
                                <div key={entry.id} className="rounded-2xl border border-slate-200/80 p-3">
                                  <div className="font-medium text-ink">{entry.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {typeLabels[locale][entry.type] ?? entry.type}
                                    {entry.durationSlots && entry.durationSlots > 1 ? ` • ${entry.durationSlots} slots` : ""}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    {entry.className ?? "—"}
                                    {entry.roomName ? ` • ${entry.roomName}` : ""}
                                  </div>
                                  {entry.teacherName ? <div className="mt-1 text-[11px] text-slate-500">{entry.teacherName}</div> : null}
                                  {entry.isReplacement ? <div className="mt-1 text-[11px] text-warning">{t.replacement}</div> : null}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{t.noEntries}</div>
            )}
          </div>
        </div>
      </div>

      {confirmRecalculateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <h4 className="text-xl font-semibold text-ink">{t.confirmAuto}</h4>
            <p className="mt-3 text-sm text-slate-600">{t.confirmAutoText}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
                onClick={() => setConfirmRecalculateOpen(false)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="rounded-2xl bg-warning px-4 py-3 text-sm font-semibold text-white"
                onClick={async () => {
                  setConfirmRecalculateOpen(false);
                  await handleAction(
                    () =>
                      fetch("/api/admin/teacher-absence", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                          teacherId,
                          affectedDate,
                          reason: absenceReason || undefined
                        })
                      }),
                    t.successRegenerate
                  );
                }}
              >
                {t.apply}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
