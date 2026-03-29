"use client";

import { useEffect, useState } from "react";
import { type Locale, getDictionary } from "@/lib/i18n";

type FeedData = {
  topStudents: Array<{ name: string; className: string; points: number }>;
  announcements: Array<{ id: string; title: string; body: string }>;
  replacements: Array<{ id: string; title: string; schoolClass?: { name: string } | null }>;
  events: Array<{ id: string; title: string; location: string | null }>;
};

export function KioskFeed({ initialData, locale }: { initialData: FeedData; locale: Locale }) {
  const [data, setData] = useState(initialData);
  const copy = getDictionary(locale);

  useEffect(() => {
    const refresh = setInterval(async () => {
      const response = await fetch("/api/kiosk/feed", { cache: "no-store" });
      const next = (await response.json()) as FeedData;
      setData(next);
    }, 30000);

    const scroll = setInterval(() => {
      window.scrollBy({ top: 1, behavior: "smooth" });
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 120);

    return () => {
      clearInterval(refresh);
      clearInterval(scroll);
    };
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section className="panel-dark p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-white/60">{copy.kiosk.topStudents}</div>
          <div className="mt-5 space-y-4">
            {data.topStudents.map((student, index) => (
              <div key={student.name} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-sm text-white/50">#{index + 1}</div>
                <div className="mt-2 text-2xl font-bold">{student.name}</div>
                <div className="mt-1 text-white/70">
                  {student.className} • {student.points} {copy.kiosk.points}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{copy.kiosk.announcements}</div>
          <div className="mt-4 space-y-4">
            {data.announcements.map((item) => (
              <div key={item.id} className="rounded-3xl bg-slate-50 p-5">
                <div className="text-xl font-semibold text-ink">{item.title}</div>
                <div className="mt-2 text-base text-slate-600">{item.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="panel p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{copy.kiosk.changes}</div>
          <div className="mt-4 space-y-4">
            {data.replacements.map((item) => (
              <div key={item.id} className="rounded-3xl bg-warning/10 p-5">
                <div className="text-xl font-semibold text-ink">{item.title}</div>
                <div className="mt-1 text-base text-slate-600">{item.schoolClass?.name ?? copy.kiosk.allClasses}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{copy.kiosk.upcomingEvents}</div>
          <div className="mt-4 space-y-4">
            {data.events.map((item) => (
              <div key={item.id} className="rounded-3xl bg-slate-50 p-5">
                <div className="text-xl font-semibold text-ink">{item.title}</div>
                <div className="mt-1 text-base text-slate-600">{item.location || copy.kiosk.campus}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
