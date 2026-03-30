"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getRoomTypeLabel } from "@/lib/schedule/copy";

const ROOM_TYPES = [
  "standard",
  "lab",
  "gym",
  "assembly",
  "library",
  "coworking",
  "outdoor"
] as const;

type RoomRecord = {
  id: string;
  name: string;
  capacity: number;
  type: (typeof ROOM_TYPES)[number];
  suitableFor: string | null;
  allowEvents: boolean;
  isActive: boolean;
  prioritySubjects: string | null;
  assignmentCount: number;
};

function createInitialForm() {
  return {
    id: null as string | null,
    name: "",
    capacity: "30",
    type: "standard" as (typeof ROOM_TYPES)[number],
    suitableFor: "",
    prioritySubjects: "",
    allowEvents: false,
    isActive: true
  };
}

export function ScheduleRoomManager({
  locale,
  rooms
}: {
  locale: "ru" | "kz";
  rooms: RoomRecord[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState(createInitialForm);

  const copy =
    locale === "kz"
      ? {
          name: "Кабинет атауы",
          capacity: "Сыйымдылыгы",
          type: "Турi",
          suitableFor: "Кандай пандерге лайык",
          prioritySubjects: "Басым пандер",
          allowEvents: "Iс-шараларга колайлы",
          active: "Белсендi",
          inactive: "Ошiрiлген",
          create: "Косу",
          update: "Жанарту",
          reset: "Тазалау",
          edit: "Озгерту",
          disable: "Ошыру",
          enable: "Косу",
          none: "Жок",
          saving: "Сакталуда...",
          success: "Кабинет дерегi сакталды.",
          failed: "Кабинеттi сактау мумкiн болмады.",
          assignments: "Жуктемелер"
        }
      : {
          name: "Название кабинета",
          capacity: "Вместимость",
          type: "Тип",
          suitableFor: "Подходит для предметов",
          prioritySubjects: "Приоритетные предметы",
          allowEvents: "Подходит для мероприятий",
          active: "Активен",
          inactive: "Выключен",
          create: "Добавить",
          update: "Обновить",
          reset: "Сбросить",
          edit: "Изменить",
          disable: "Выключить",
          enable: "Включить",
          none: "Нет",
          saving: "Сохранение...",
          success: "Данные кабинета сохранены.",
          failed: "Не удалось сохранить кабинет.",
          assignments: "Назначения"
        };

  function resetForm() {
    setForm(createInitialForm());
  }

  function startEdit(room: RoomRecord) {
    setForm({
      id: room.id,
      name: room.name,
      capacity: String(room.capacity),
      type: room.type,
      suitableFor: room.suitableFor ?? "",
      prioritySubjects: room.prioritySubjects ?? "",
      allowEvents: room.allowEvents,
      isActive: room.isActive
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
      form.id ? `/api/admin/schedule/rooms/${form.id}` : "/api/admin/schedule/rooms",
      {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          capacity: Number(form.capacity),
          type: form.type,
          suitableFor: form.suitableFor || null,
          prioritySubjects: form.prioritySubjects || null,
          allowEvents: form.allowEvents,
          isActive: form.isActive
        })
      },
      resetForm
    );
  }

  async function toggle(room: RoomRecord) {
    await request(`/api/admin/schedule/rooms/${room.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: room.name,
        capacity: room.capacity,
        type: room.type,
        suitableFor: room.suitableFor,
        prioritySubjects: room.prioritySubjects,
        allowEvents: room.allowEvents,
        isActive: !room.isActive
      })
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.name}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          type="number"
          min={1}
          placeholder={copy.capacity}
          value={form.capacity}
          onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
        />
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.type}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              type: event.target.value as (typeof ROOM_TYPES)[number]
            }))
          }
        >
          {ROOM_TYPES.map((type) => (
            <option key={type} value={type}>
              {getRoomTypeLabel(locale, type)}
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.suitableFor}
          value={form.suitableFor}
          onChange={(event) =>
            setForm((current) => ({ ...current, suitableFor: event.target.value }))
          }
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2"
          placeholder={copy.prioritySubjects}
          value={form.prioritySubjects}
          onChange={(event) =>
            setForm((current) => ({ ...current, prioritySubjects: event.target.value }))
          }
        />
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.allowEvents}
            onChange={(event) =>
              setForm((current) => ({ ...current, allowEvents: event.target.checked }))
            }
          />
          {copy.allowEvents}
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          />
          {copy.active}
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isSubmitting || !form.name.trim()}
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
        {rooms.map((room) => (
          <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">{room.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {getRoomTypeLabel(locale, room.type)} • {copy.capacity}: {room.capacity}
                </div>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  room.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {room.isActive ? copy.active : copy.inactive}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <div>{room.suitableFor ?? copy.none}</div>
              <div>{room.prioritySubjects ?? copy.none}</div>
              <div>
                {copy.assignments}: {room.assignmentCount}
              </div>
              <div>{room.allowEvents ? copy.allowEvents : copy.none}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => startEdit(room)}
              >
                {copy.edit}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => void toggle(room)}
              >
                {room.isActive ? copy.disable : copy.enable}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
