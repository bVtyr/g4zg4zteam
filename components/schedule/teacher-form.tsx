"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TeacherForm({
  locale,
  rooms
}: {
  locale: "ru" | "kz";
  rooms: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    fullName: "",
    title: "",
    expertise: "",
    preferredRoomId: rooms[0]?.id ?? "",
    canSubstitute: true,
    isActive: true,
    availabilityNote: "",
    substituteWeight: "50"
  });

  const copy =
    locale === "kz"
      ? {
          fullName: "Толық аты-жөні",
          title: "Лауазымы",
          expertise: "Бағыты",
          room: "Негізгі кабинет",
          availability: "Қолжетімділік ескертпесі",
          weight: "Ауыстыру басымдығы",
          canSubstitute: "Ауыстыруға болады",
          active: "Белсенді",
          submit: "Мұғалім қосу"
        }
      : {
          fullName: "ФИО",
          title: "Должность",
          expertise: "Экспертиза",
          room: "Основной кабинет",
          availability: "Примечание по доступности",
          weight: "Приоритет на замену",
          canSubstitute: "Может заменять",
          active: "Активен",
          submit: "Добавить учителя"
        };

  async function submit() {
    await fetch("/api/admin/schedule/teachers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        substituteWeight: Number(form.substituteWeight)
      })
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.fullName} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.title} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.expertise} value={form.expertise} onChange={(event) => setForm((current) => ({ ...current, expertise: event.target.value }))} />
      <select className="rounded-lg border border-slate-300 px-3 py-2.5" value={form.preferredRoomId} onChange={(event) => setForm((current) => ({ ...current, preferredRoomId: event.target.value }))}>
        {rooms.map((room) => <option key={room.id} value={room.id}>{`${copy.room}: ${room.name}`}</option>)}
      </select>
      <input className="rounded-lg border border-slate-300 px-3 py-2.5 xl:col-span-2" placeholder={copy.availability} value={form.availabilityNote} onChange={(event) => setForm((current) => ({ ...current, availabilityNote: event.target.value }))} />
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.weight} value={form.substituteWeight} onChange={(event) => setForm((current) => ({ ...current, substituteWeight: event.target.value }))} />
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
        <input type="checkbox" checked={form.canSubstitute} onChange={(event) => setForm((current) => ({ ...current, canSubstitute: event.target.checked }))} />
        {copy.canSubstitute}
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
        {copy.active}
      </label>
      <div className="md:col-span-2 xl:col-span-4">
        <button type="button" className="rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white" disabled={isPending || !form.fullName} onClick={() => void submit()}>
          {copy.submit}
        </button>
      </div>
    </div>
  );
}
