"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeacherRecord = {
  id: string;
  fullName: string;
  username: string;
  title: string | null;
  expertise: string | null;
  preferredRoomId: string | null;
  preferredRoomName: string | null;
  canSubstitute: boolean;
  isActive: boolean;
  availabilityNote: string | null;
  substituteWeight: number;
  assignmentCount: number;
  assignments: Array<{
    id: string;
    className: string;
    subjectName: string;
    roomName: string | null;
    weeklyLoad: number;
  }>;
};

type RoomOption = {
  id: string;
  name: string;
};

function createInitialForm(rooms: RoomOption[]) {
  return {
    id: null as string | null,
    fullName: "",
    title: "",
    expertise: "",
    preferredRoomId: rooms[0]?.id ?? "",
    canSubstitute: true,
    isActive: true,
    availabilityNote: "",
    substituteWeight: "50"
  };
}

export function ScheduleTeacherManager({
  locale,
  teachers,
  rooms
}: {
  locale: "ru" | "kz";
  teachers: TeacherRecord[];
  rooms: RoomOption[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState(() => createInitialForm(rooms));

  const copy =
    locale === "kz"
      ? {
          fullName: "Аты-жонi",
          title: "Лауазымы",
          expertise: "Пандiк багыт",
          preferredRoom: "Негiзгi кабинет",
          availabilityNote: "Колжетiмдiлiк ескертпесi",
          substituteWeight: "Алмастыру басымдыгы",
          canSubstitute: "Алмастыруга катысады",
          status: "Белсендi",
          create: "Косу",
          update: "Жанарту",
          reset: "Тазалау",
          edit: "Озгерту",
          disable: "Ошыру",
          enable: "Косу",
          active: "Белсендi",
          inactive: "Ошiрiлген",
          load: "Жуктеме",
          none: "Жок",
          saving: "Сакталуда...",
          success: "Мугалiм дерегi сакталды.",
          failed: "Мугалiмдi сактау мумкiн болмады."
        }
      : {
          fullName: "ФИО",
          title: "Должность",
          expertise: "Предметная специализация",
          preferredRoom: "Основной кабинет",
          availabilityNote: "Примечание по доступности",
          substituteWeight: "Приоритет на замену",
          canSubstitute: "Участвует в заменах",
          status: "Активен",
          create: "Добавить",
          update: "Обновить",
          reset: "Сбросить",
          edit: "Изменить",
          disable: "Выключить",
          enable: "Включить",
          active: "Активен",
          inactive: "Выключен",
          load: "Нагрузка",
          none: "Нет",
          saving: "Сохранение...",
          success: "Данные учителя сохранены.",
          failed: "Не удалось сохранить учителя."
        };

  function resetForm() {
    setForm(createInitialForm(rooms));
  }

  function startEdit(teacher: TeacherRecord) {
    setForm({
      id: teacher.id,
      fullName: teacher.fullName,
      title: teacher.title ?? "",
      expertise: teacher.expertise ?? "",
      preferredRoomId: teacher.preferredRoomId ?? "",
      canSubstitute: teacher.canSubstitute,
      isActive: teacher.isActive,
      availabilityNote: teacher.availabilityNote ?? "",
      substituteWeight: String(teacher.substituteWeight)
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
      form.id ? `/api/admin/schedule/teachers/${form.id}` : "/api/admin/schedule/teachers",
      {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: form.fullName,
          title: form.title || null,
          expertise: form.expertise || null,
          preferredRoomId: form.preferredRoomId || null,
          canSubstitute: form.canSubstitute,
          isActive: form.isActive,
          availabilityNote: form.availabilityNote || null,
          substituteWeight: Number(form.substituteWeight)
        })
      },
      resetForm
    );
  }

  async function toggle(teacher: TeacherRecord) {
    await request(`/api/admin/schedule/teachers/${teacher.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fullName: teacher.fullName,
        title: teacher.title,
        expertise: teacher.expertise,
        preferredRoomId: teacher.preferredRoomId,
        canSubstitute: teacher.canSubstitute,
        isActive: !teacher.isActive,
        availabilityNote: teacher.availabilityNote,
        substituteWeight: teacher.substituteWeight
      })
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.fullName}
          value={form.fullName}
          onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.title}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.expertise}
          value={form.expertise}
          onChange={(event) => setForm((current) => ({ ...current, expertise: event.target.value }))}
        />
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.preferredRoomId}
          onChange={(event) => setForm((current) => ({ ...current, preferredRoomId: event.target.value }))}
        >
          <option value="">{copy.none}</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2"
          placeholder={copy.availabilityNote}
          value={form.availabilityNote}
          onChange={(event) =>
            setForm((current) => ({ ...current, availabilityNote: event.target.value }))
          }
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          type="number"
          min={0}
          max={100}
          placeholder={copy.substituteWeight}
          value={form.substituteWeight}
          onChange={(event) =>
            setForm((current) => ({ ...current, substituteWeight: event.target.value }))
          }
        />
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.canSubstitute}
            onChange={(event) =>
              setForm((current) => ({ ...current, canSubstitute: event.target.checked }))
            }
          />
          {copy.canSubstitute}
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          />
          {copy.status}
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isSubmitting || !form.fullName.trim()}
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

      <div className="space-y-3">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">{teacher.fullName}</div>
                <div className="mt-1 text-xs text-slate-500">@{teacher.username}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    teacher.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  {teacher.isActive ? copy.active : copy.inactive}
                </span>
                {teacher.canSubstitute ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {copy.canSubstitute}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <div>{teacher.title ?? copy.none}</div>
              <div>{teacher.expertise ?? copy.none}</div>
              <div>
                {copy.load}: {teacher.assignmentCount}
              </div>
              <div>{teacher.preferredRoomName ?? copy.none}</div>
            </div>
            {teacher.assignments.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {teacher.assignments.slice(0, 4).map((assignment) => (
                  <span
                    key={assignment.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {assignment.className} • {assignment.subjectName} • {assignment.weeklyLoad}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => startEdit(teacher)}
              >
                {copy.edit}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => void toggle(teacher)}
              >
                {teacher.isActive ? copy.disable : copy.enable}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
