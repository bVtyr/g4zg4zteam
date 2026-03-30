"use client";

import { useEffect, useState } from "react";
import { type Locale } from "@/lib/i18n";

type FeedData = {
  leadersToday: Array<{
    id: string;
    rank: number;
    name: string;
    className: string;
    score: number;
    metric: string;
    reason: string;
  }>;
  leadersWeek: Array<{
    id: string;
    rank: number;
    name: string;
    className: string;
    score: number;
    metric: string;
    reason: string;
  }>;
  achievements: Array<{
    id: string;
    studentName: string;
    className: string;
    title: string;
    subtitle: string | null;
    occurredAtLabel: string;
  }>;
  replacements: Array<{
    id: string;
    title: string;
    className: string;
    teacherName: string;
    roomName: string;
    timeLabel: string;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    meta: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    body: string;
    meta: string;
  }>;
  generatedAt: string;
  windows: {
    today: string;
    week: string;
  };
};

function getCopy(locale: Locale) {
  if (locale === "kz") {
    return {
      today: "Бүгін",
      week: "Апта",
      leadersToday: "Күн көшбасшылары",
      leadersWeek: "Апта көшбасшылары",
      achievements: "Жетістіктер",
      replacements: "Ауыстырулар",
      announcements: "Хабарламалар",
      events: "Алдағы оқиғалар",
      updated: "Жаңартылды",
      noAchievements: "Жаңа жетістік әзірге жоқ.",
      noReplacements: "Бүгін ауыстыру жоқ.",
      noAnnouncements: "Маңызды хабарлама жоқ.",
      noEvents: "Жақын күндері іс-шара жоқ."
    };
  }

  return {
    today: "Сегодня",
    week: "Неделя",
    leadersToday: "Лидеры дня",
    leadersWeek: "Лидеры недели",
    achievements: "Достижения",
    replacements: "Замены",
    announcements: "Анонсы",
    events: "События",
    updated: "Обновлено",
    noAchievements: "Новых достижений пока нет.",
    noReplacements: "Сегодня замен нет.",
    noAnnouncements: "Важных анонсов пока нет.",
    noEvents: "Ближайших событий пока нет."
  };
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-5 py-5 text-base text-white/65">
      {text}
    </div>
  );
}

export function KioskFeed({ initialData, locale }: { initialData: FeedData; locale: Locale }) {
  const [data, setData] = useState(initialData);
  const copy = getCopy(locale);

  useEffect(() => {
    const refresh = setInterval(async () => {
      try {
        const response = await fetch("/api/kiosk/feed", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const next = (await response.json()) as FeedData;
        setData(next);
      } catch {
        // Keep the last valid kiosk snapshot on screen.
      }
    }, 30000);

    return () => {
      clearInterval(refresh);
    };
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 xl:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">{copy.today}</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white xl:text-4xl">
                {copy.leadersToday}
              </h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65">
              {data.windows.today}
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.leadersToday.map((student) => (
              <article key={student.id} className="rounded-[1.75rem] border border-white/10 bg-[#11204a] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-[#9bb7ff]">#{student.rank}</div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
                    {student.metric}
                  </div>
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{student.name}</div>
                <div className="mt-1 text-base text-white/65">{student.className}</div>
                <div className="mt-4 text-sm leading-6 text-white/78">{student.reason}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 xl:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">{copy.week}</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white xl:text-4xl">
                {copy.leadersWeek}
              </h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65">
              {data.windows.week}
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {data.leadersWeek.map((student) => (
              <article
                key={student.id}
                className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <div className="text-xl font-semibold text-[#ffd77b]">#{student.rank}</div>
                <div>
                  <div className="text-xl font-semibold text-white">{student.name}</div>
                  <div className="mt-1 text-sm text-white/65">{student.className}</div>
                  <div className="mt-2 text-sm text-white/78">{student.reason}</div>
                </div>
                <div className="self-center rounded-full bg-white/10 px-3 py-1 text-sm text-white/72">
                  {student.metric}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 xl:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-white xl:text-3xl">
              {copy.achievements}
            </h2>
            <div className="text-sm text-white/55">
              {copy.updated}:{" "}
              {new Date(data.generatedAt).toLocaleTimeString(locale === "kz" ? "kk-KZ" : "ru-RU", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.achievements.length ? (
              data.achievements.map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-base text-white/70">
                        {item.studentName} • {item.className}
                      </div>
                    </div>
                    <div className="text-sm text-white/45">{item.occurredAtLabel}</div>
                  </div>
                  {item.subtitle ? <div className="mt-3 text-sm text-white/72">{item.subtitle}</div> : null}
                </article>
              ))
            ) : (
              <EmptyCard text={copy.noAchievements} />
            )}
          </div>
        </section>

        <section className="grid gap-6 2xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.replacements}</h2>
            <div className="mt-5 space-y-3">
              {data.replacements.length ? (
                data.replacements.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4">
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-sm text-white/72">{item.className}</div>
                    <div className="mt-3 text-sm leading-6 text-white/78">
                      {item.timeLabel}
                      <br />
                      {item.teacherName} • {item.roomName}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyCard text={copy.noReplacements} />
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.events}</h2>
            <div className="mt-5 space-y-3">
              {data.events.length ? (
                data.events.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm text-white/72">{item.body}</div>
                    <div className="mt-3 text-sm text-white/48">{item.meta}</div>
                  </article>
                ))
              ) : (
                <EmptyCard text={copy.noEvents} />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 xl:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white xl:text-3xl">
            {copy.announcements}
          </h2>
          <div className="mt-5 space-y-3">
            {data.announcements.length ? (
              data.announcements.map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-white/45">{item.meta}</div>
                  </div>
                  <div className="mt-3 text-base leading-7 text-white/76">{item.body}</div>
                </article>
              ))
            ) : (
              <EmptyCard text={copy.noAnnouncements} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
