"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TimeSlotEditor({
  locale,
  timeSlots
}: {
  locale: "ru" | "kz";
  timeSlots: Array<{
    id: string;
    slotNumber: number;
    label: string | null;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    isActive: boolean;
  }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    slotNumber: String(timeSlots.length + 1),
    label: "",
    startTime: "08:00",
    endTime: "08:45",
    isBreak: false,
    isActive: true
  });

  const copy =
    locale === "kz"
      ? {
          slot: "Слот №",
          label: "Белгісі",
          start: "Басталуы",
          end: "Аяқталуы",
          status: "Мәртебе",
          active: "Белсенді",
          inactive: "Белсенді емес",
          submit: "Слот қосу"
        }
      : {
          slot: "Слот №",
          label: "Метка",
          start: "Начало",
          end: "Окончание",
          status: "Статус",
          active: "Активен",
          inactive: "Неактивен",
          submit: "Добавить слот"
        };

  async function submit() {
    await fetch("/api/admin/schedule/time-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        slotNumber: Number(form.slotNumber)
      })
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
        <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.slot} value={form.slotNumber} onChange={(event) => setForm((current) => ({ ...current, slotNumber: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2.5" placeholder={copy.label} value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2.5" type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
        <input className="rounded-lg border border-slate-300 px-3 py-2.5" type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
        <button type="button" className="rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white" disabled={isPending} onClick={() => void submit()}>
          {copy.submit}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
              <th className="px-3 py-3">{copy.slot}</th>
              <th className="px-3 py-3">{copy.label}</th>
              <th className="px-3 py-3">{copy.start}</th>
              <th className="px-3 py-3">{copy.end}</th>
              <th className="px-3 py-3">{copy.status}</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => (
              <tr key={slot.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-3 py-3 font-medium text-ink">{slot.slotNumber}</td>
                <td className="px-3 py-3 text-slate-600">{slot.label ?? "—"}</td>
                <td className="px-3 py-3 text-slate-600">{slot.startTime}</td>
                <td className="px-3 py-3 text-slate-600">{slot.endTime}</td>
                <td className="px-3 py-3 text-slate-600">{slot.isActive ? copy.active : copy.inactive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
