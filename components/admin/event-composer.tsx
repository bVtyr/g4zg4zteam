"use client";

import { useState } from "react";
import { type Locale } from "@/lib/i18n";

const copy = {
  ru: {
    title: "Публикация события",
    subtitle: "Отдельная форма для школьных событий и новостей без смешения с уведомлениями.",
    eventType: "Тип события",
    description: "Описание",
    location: "Локация",
    start: "Начало",
    end: "Завершение",
    publish: "Опубликовать событие",
    saved: "Событие опубликовано.",
    failed: "Не удалось сохранить событие.",
    titlePlaceholder: "Название события",
    types: {
      news: "Новость",
      competition: "Конкурс",
      assembly: "Сбор",
      celebration: "Праздник",
      meeting: "Встреча"
    }
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
    failed: "Іс-шараны сақтау мүмкін болмады.",
    titlePlaceholder: "Іс-шара атауы",
    types: {
      news: "Жаңалық",
      competition: "Байқау",
      assembly: "Жиын",
      celebration: "Мереке",
      meeting: "Кездесу"
    }
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
        const startsAt = String(formData.get("startsAt") ?? "");
        const endsAt = String(formData.get("endsAt") ?? "");
        const payload = {
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          type: String(formData.get("type") ?? "news"),
          startsAt: startsAt ? new Date(startsAt).toISOString() : "",
          endsAt: endsAt ? new Date(endsAt).toISOString() : "",
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
      <input name="title" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.titlePlaceholder} required />
      <textarea
        name="description"
        className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3"
        placeholder={t.description}
        required
      />
      <div className="grid gap-3 md:grid-cols-2">
        <select name="type" className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="news">{t.types.news}</option>
          <option value="competition">{t.types.competition}</option>
          <option value="assembly">{t.types.assembly}</option>
          <option value="celebration">{t.types.celebration}</option>
          <option value="meeting">{t.types.meeting}</option>
        </select>
        <input name="location" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.location} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-500">
          <span>{t.start}</span>
          <input name="startsAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink" required />
        </label>
        <label className="space-y-2 text-sm text-slate-500">
          <span>{t.end}</span>
          <input name="endsAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink" required />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <button className="rounded-2xl bg-royal px-5 py-3 font-semibold text-white">{t.publish}</button>
        {status ? <span className="text-sm text-slate-500">{status}</span> : null}
      </div>
    </form>
  );
}
