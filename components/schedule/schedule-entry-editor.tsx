"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScheduleEntryType } from "@prisma/client";
import { getScheduleDayLabels, getScheduleEntryTypeLabel } from "@/lib/schedule/copy";

const entryTypes = Object.values(ScheduleEntryType);

export function ScheduleEntryEditor({
  locale,
  classes,
  subjects,
  teachers,
  rooms,
  existingEntry
}: {
  locale: "ru" | "kz";
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; user: { fullName: string } }>;
  rooms: Array<{ id: string; name: string }>;
  existingEntry?: {
    id: string;
    title: string;
    classId: string | null;
    subjectId: string | null;
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    slotNumber: number | null;
    durationSlots: number | null;
    type: ScheduleEntryType;
    notes: string | null;
    isLocked: boolean;
  } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [duplicateDays, setDuplicateDays] = useState("");
  const days = getScheduleDayLabels(locale);
  const copy =
    locale === "kz"
      ? {
          save: existingEntry ? "Өзгерісті сақтау" : "Жазба қосу",
          duplicate: "Көшіру",
          failed: "Сақтау қатесі",
          saved: "Сақталды",
          title: "Атауы",
          classLabel: "Сынып",
          subject: "Пән",
          teacher: "Мұғалім",
          room: "Кабинет",
          day: "Күн",
          slot: "Слот",
          duration: "Ұзақтығы",
          type: "Түрі",
          notes: "Ескертпе",
          locked: "Жазбаны бекіту",
          duplicateHint: "Күндерді үтірмен жазыңыз, мысалы 2,4,5",
          none: "Таңдалмаған"
        }
      : {
          save: existingEntry ? "Сохранить изменения" : "Добавить запись",
          duplicate: "Дублировать",
          failed: "Ошибка сохранения",
          saved: "Сохранено",
          title: "Название",
          classLabel: "Класс",
          subject: "Предмет",
          teacher: "Учитель",
          room: "Кабинет",
          day: "День",
          slot: "Слот",
          duration: "Длительность",
          type: "Тип",
          notes: "Комментарий",
          locked: "Зафиксировать запись",
          duplicateHint: "Введите дни через запятую, например 2,4,5",
          none: "Не выбрано"
        };

  const [form, setForm] = useState({
    title: existingEntry?.title ?? "",
    classId: existingEntry?.classId ?? classes[0]?.id ?? "",
    subjectId: existingEntry?.subjectId ?? subjects[0]?.id ?? "",
    teacherId: existingEntry?.teacherId ?? teachers[0]?.id ?? "",
    roomId: existingEntry?.roomId ?? rooms[0]?.id ?? "",
    dayOfWeek: String(existingEntry?.dayOfWeek ?? 1),
    slotNumber: String(existingEntry?.slotNumber ?? 1),
    durationSlots: String(existingEntry?.durationSlots ?? 1),
    type: existingEntry?.type ?? ScheduleEntryType.lesson,
    notes: existingEntry?.notes ?? "",
    isLocked: existingEntry?.isLocked ?? false
  });

  async function submit() {
    setFeedback(null);
    const payload = {
      title: form.title,
      classId: form.classId || null,
      subjectId: form.subjectId || null,
      teacherId: form.teacherId || null,
      roomId: form.roomId || null,
      dayOfWeek: Number(form.dayOfWeek),
      slotNumber: Number(form.slotNumber),
      durationSlots: Number(form.durationSlots),
      type: form.type,
      notes: form.notes || null,
      isLocked: form.isLocked
    };
    const response = await fetch(existingEntry ? `/api/admin/schedule/entries/${existingEntry.id}` : "/api/admin/schedule/manual-entry", {
      method: existingEntry ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      return;
    }
    setFeedback(copy.saved);
    startTransition(() => router.refresh());
  }

  async function duplicate() {
    if (!existingEntry || !duplicateDays.trim()) {
      return;
    }
    const dayOfWeeks = duplicateDays.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item >= 1 && item <= 7);
    const response = await fetch(`/api/admin/schedule/entries/${existingEntry.id}/duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ dayOfWeeks })
    });
    if (response.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.title}</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.classLabel}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}>
            <option value="">{copy.none}</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.subject}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}>
            <option value="">{copy.none}</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.teacher}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.teacherId} onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}>
            <option value="">{copy.none}</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.fullName}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.room}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.roomId} onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value }))}>
            <option value="">{copy.none}</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.day}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.dayOfWeek} onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))}>
            {days.map((day, index) => <option key={day} value={String(index + 1)}>{day}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.slot}</span>
          <input type="number" min="1" max="10" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.slotNumber} onChange={(event) => setForm((current) => ({ ...current, slotNumber: event.target.value }))} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.duration}</span>
          <input type="number" min="1" max="4" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.durationSlots} onChange={(event) => setForm((current) => ({ ...current, durationSlots: event.target.value }))} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.type}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ScheduleEntryType }))}>
            {entryTypes.map((type) => <option key={type} value={type}>{getScheduleEntryTypeLabel(locale, type)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm md:col-span-2 xl:col-span-3">
          <span className="text-slate-500">{copy.notes}</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <input type="checkbox" checked={form.isLocked} onChange={(event) => setForm((current) => ({ ...current, isLocked: event.target.checked }))} />
          {copy.locked}
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white" disabled={isPending || !form.title} onClick={() => void submit()}>
          {copy.save}
        </button>
        {existingEntry ? (
          <>
            <input className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder={copy.duplicateHint} value={duplicateDays} onChange={(event) => setDuplicateDays(event.target.value)} />
            <button type="button" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700" disabled={isPending} onClick={() => void duplicate()}>
              {copy.duplicate}
            </button>
          </>
        ) : null}
      </div>
      {feedback ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{feedback}</div> : null}
    </div>
  );
}
