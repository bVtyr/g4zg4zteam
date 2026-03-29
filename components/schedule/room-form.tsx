"use client";

import { useState, useTransition } from "react";
import { RoomType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { getRoomTypeLabel } from "@/lib/schedule/copy";

const roomTypes = Object.values(RoomType);

export function RoomForm({ locale }: { locale: "ru" | "kz" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<{
    name: string;
    capacity: string;
    type: RoomType;
    suitableFor: string;
    allowEvents: boolean;
    isActive: boolean;
    prioritySubjects: string;
  }>({
    name: "",
    capacity: "30",
    type: RoomType.standard,
    suitableFor: "",
    allowEvents: false,
    isActive: true,
    prioritySubjects: ""
  });

  const copy =
    locale === "kz"
      ? {
          name: "Кабинет атауы",
          capacity: "Сыйымдылығы",
          type: "Түрі",
          suitableFor: "Сәйкес пәндер",
          prioritySubjects: "Басым пәндер",
          allowEvents: "Іс-шараға қолайлы",
          active: "Белсенді",
          submit: "Кабинет қосу"
        }
      : {
          name: "Название кабинета",
          capacity: "Вместимость",
          type: "Тип",
          suitableFor: "Подходящие предметы",
          prioritySubjects: "Приоритетные предметы",
          allowEvents: "Подходит для мероприятий",
          active: "Активен",
          submit: "Добавить кабинет"
        };

  async function submit() {
    await fetch("/api/admin/schedule/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        capacity: Number(form.capacity)
      })
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.name} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.capacity} value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} />
      <select className="rounded-lg border border-slate-300 px-3 py-2.5" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RoomType }))}>
        {roomTypes.map((type) => <option key={type} value={type}>{getRoomTypeLabel(locale, type)}</option>)}
      </select>
      <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.suitableFor} value={form.suitableFor} onChange={(event) => setForm((current) => ({ ...current, suitableFor: event.target.value }))} />
      <input className="rounded-lg border border-slate-300 px-3 py-2.5 md:col-span-2 xl:col-span-2" placeholder={copy.prioritySubjects} value={form.prioritySubjects} onChange={(event) => setForm((current) => ({ ...current, prioritySubjects: event.target.value }))} />
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
        <input type="checkbox" checked={form.allowEvents} onChange={(event) => setForm((current) => ({ ...current, allowEvents: event.target.checked }))} />
        {copy.allowEvents}
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
        {copy.active}
      </label>
      <div className="md:col-span-2 xl:col-span-4">
        <button type="button" className="rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white" disabled={isPending || !form.name} onClick={() => void submit()}>
          {copy.submit}
        </button>
      </div>
    </div>
  );
}
