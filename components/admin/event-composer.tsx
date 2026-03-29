"use client";

import { useState } from "react";
import { type Locale } from "@/lib/i18n";

const copy = {
  ru: {
    title: "Публикация события",
    subtitle: "Отдельная форма для школьных мероприятий и новостей без смешивания с уведомлениями.",
    eventType: "Тип события",
    description: "Описание",
    location: "Локация",
    start: "Начало",
    end: "Завершение",
    publish: "Опубликовать событие",
    saved: "Событие опубликовано.",
    failed: "Не удалось сохранить событие."
  },
  kz: {
    title: "Іс-шара жариялау",
    subtitle: "Хабарламалардан бөлек мектеп оқиғалары мен жаңалықтарына арналған форма.",
    eventType: "Іс-шара түрі",
    description: "Сипаттама",
    location: "Орны",
    start: "Басталуы",
    end: "Аяқталуы",
    publish: "Іс-шараны жариялау",
    saved: "Іс-шара жарияланды.",
    failed: "Іс-шараны сақтау мүмкін болмады."
  }
} as const;

export function EventComposer({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      className="panel space-y-4 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          type: String(formData.get("type") ?? "news"),
          startsAt: String(formData.get("startsAt") ?? ""),
          endsAt: String(formData.get("endsAt") ?? ""),
          location: String(formData.get("location") ?? "")
        };

        const response = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        setStatus(response.ok ? t.saved : t.failed);
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-ink">{t.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </div>
      <input name="title" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Title" />
      <textarea
        name="description"
        className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3"
        placeholder={t.description}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <select name="type" className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="news">News</option>
          <option value="competition">Competition</option>
          <option value="assembly">Assembly</option>
          <option value="celebration">Celebration</option>
          <option value="meeting">Meeting</option>
        </select>
        <input
          name="location"
          className="rounded-2xl border border-slate-200 px-4 py-3"
          placeholder={t.location}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-500">
          <span>{t.start}</span>
          <input name="startsAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink" />
        </label>
        <label className="space-y-2 text-sm text-slate-500">
          <span>{t.end}</span>
          <input name="endsAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink" />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <button className="rounded-2xl bg-royal px-5 py-3 font-semibold text-white">{t.publish}</button>
        {status ? <span className="text-sm text-slate-500">{status}</span> : null}
      </div>
    </form>
  );
}
