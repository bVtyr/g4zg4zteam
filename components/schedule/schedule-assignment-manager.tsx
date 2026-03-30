"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AssignmentRecord = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  roomId: string | null;
  roomName: string | null;
  weeklyLoad: number;
  subgroup: string | null;
  streamKey: string | null;
};

type Option = {
  id: string;
  name: string;
};

function createInitialForm(
  classes: Option[],
  subjects: Option[],
  teachers: Option[],
  rooms: Option[]
) {
  return {
    id: null as string | null,
    classId: classes[0]?.id ?? "",
    subjectId: subjects[0]?.id ?? "",
    teacherId: teachers[0]?.id ?? "",
    roomId: rooms[0]?.id ?? "",
    weeklyLoad: "2",
    subgroup: "",
    streamKey: ""
  };
}

export function ScheduleAssignmentManager({
  locale,
  assignments,
  classes,
  subjects,
  teachers,
  rooms
}: {
  locale: "ru" | "kz";
  assignments: AssignmentRecord[];
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
  rooms: Option[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState(() =>
    createInitialForm(classes, subjects, teachers, rooms)
  );

  const copy =
    locale === "kz"
      ? {
          classField: "Сынып",
          subjectField: "Пан",
          teacherField: "Мугалiм",
          roomField: "Кабинет",
          weeklyLoad: "Апталык жуктеме",
          subgroup: "Кiшi топ",
          streamKey: "Поток / stream",
          meta: "Meta",
          create: "Косу",
          update: "Жанарту",
          reset: "Тазалау",
          edit: "Озгерту",
          remove: "Ошыру",
          none: "Жок",
          saving: "Сакталуда...",
          success: "Teaching assignment сакталды.",
          failed: "Teaching assignment сакталмады.",
          confirmDelete: "Осы teaching assignment жазбасын ошыру керек пе?"
        }
      : {
          classField: "Класс",
          subjectField: "Предмет",
          teacherField: "Учитель",
          roomField: "Кабинет",
          weeklyLoad: "Нагрузка в неделю",
          subgroup: "Подгруппа",
          streamKey: "Поток / stream",
          meta: "Meta",
          create: "Добавить",
          update: "Обновить",
          reset: "Сбросить",
          edit: "Изменить",
          remove: "Удалить",
          none: "Нет",
          saving: "Сохранение...",
          success: "Teaching assignment сохранен.",
          failed: "Не удалось сохранить teaching assignment.",
          confirmDelete: "Удалить это назначение из teaching assignments?"
        };

  function resetForm() {
    setForm(createInitialForm(classes, subjects, teachers, rooms));
  }

  function startEdit(assignment: AssignmentRecord) {
    setForm({
      id: assignment.id,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      roomId: assignment.roomId ?? "",
      weeklyLoad: String(assignment.weeklyLoad),
      subgroup: assignment.subgroup ?? "",
      streamKey: assignment.streamKey ?? ""
    });
  }

  async function request(url: string, init: RequestInit, onSuccess?: () => void) {
    try {
      setIsSubmitting(true);
      setFeedback(null);
      const response = await fetch(url, init);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback(body?.error ?? copy.failed);
        return;
      }

      onSuccess?.();
      setFeedback(copy.success);
      router.refresh();
    } catch {
      setFeedback(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit() {
    await request(
      form.id
        ? `/api/admin/schedule/assignments/${form.id}`
        : "/api/admin/schedule/assignments",
      {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          classId: form.classId,
          subjectId: form.subjectId,
          teacherId: form.teacherId,
          roomId: form.roomId || null,
          weeklyLoad: Number(form.weeklyLoad),
          subgroup: form.subgroup || null,
          streamKey: form.streamKey || null
        })
      },
      resetForm
    );
  }

  async function remove(assignmentId: string) {
    if (!window.confirm(copy.confirmDelete)) {
      return;
    }

    await request(
      `/api/admin/schedule/assignments/${assignmentId}`,
      {
        method: "DELETE"
      },
      () => {
        if (form.id === assignmentId) {
          resetForm();
        }
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.classId}
          onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}
        >
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {copy.classField}: {schoolClass.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.subjectId}
          onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {copy.subjectField}: {subject.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.teacherId}
          onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}
        >
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {copy.teacherField}: {teacher.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.roomId}
          onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value }))}
        >
          <option value="">{copy.none}</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {copy.roomField}: {room.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          type="number"
          min={1}
          max={50}
          placeholder={copy.weeklyLoad}
          value={form.weeklyLoad}
          onChange={(event) => setForm((current) => ({ ...current, weeklyLoad: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.subgroup}
          value={form.subgroup}
          onChange={(event) => setForm((current) => ({ ...current, subgroup: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2"
          placeholder={copy.streamKey}
          value={form.streamKey}
          onChange={(event) => setForm((current) => ({ ...current, streamKey: event.target.value }))}
        />
        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isSubmitting || !form.classId || !form.subjectId || !form.teacherId}
            onClick={() => void submit()}
          >
            {isSubmitting ? copy.saving : form.id ? copy.update : copy.create}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            onClick={resetForm}
          >
            {copy.reset}
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">{copy.classField}</th>
              <th className="px-3 py-3">{copy.subjectField}</th>
              <th className="px-3 py-3">{copy.teacherField}</th>
              <th className="px-3 py-3">{copy.roomField}</th>
              <th className="px-3 py-3">{copy.weeklyLoad}</th>
              <th className="px-3 py-3">{copy.meta}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="border-t border-slate-200 align-top">
                <td className="px-3 py-3 font-medium text-ink">{assignment.className}</td>
                <td className="px-3 py-3 text-slate-600">{assignment.subjectName}</td>
                <td className="px-3 py-3 text-slate-600">{assignment.teacherName}</td>
                <td className="px-3 py-3 text-slate-600">{assignment.roomName ?? copy.none}</td>
                <td className="px-3 py-3 text-slate-600">{assignment.weeklyLoad}</td>
                <td className="px-3 py-3 text-slate-600">
                  {[assignment.subgroup, assignment.streamKey].filter(Boolean).join(" • ") || copy.none}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => startEdit(assignment)}
                    >
                      {copy.edit}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => void remove(assignment.id)}
                    >
                      {copy.remove}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
