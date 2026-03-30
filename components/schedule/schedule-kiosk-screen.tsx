"use client";

import { useEffect, useState } from "react";
import { Maximize2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleResponsiveGrid } from "@/components/schedule/schedule-responsive-grid";

type KioskEntry = {
  id: string;
  title: string;
  type: any;
  dayOfWeek: number;
  slotNumber: number | null;
  slotIndex: number | null;
  durationSlots: number | null;
  schoolClass?: { name: string } | null;
  teacher?: { user: { fullName: string } } | null;
  room?: { name: string } | null;
};

type KioskData = {
  filters: {
    schoolYear: string;
    term: string;
    classId: string | null;
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
  };
  filterOptions: {
    classes: Array<{ id: string; name: string }>;
    teachers: Array<{ id: string; name: string }>;
    rooms: Array<{ id: string; name: string }>;
  };
  timeSlots: Array<{ slotNumber: number; startTime: string; endTime: string }>;
  entries: KioskEntry[];
  currentDayOfWeek: number;
  currentTime: string;
  currentSlot: number | null;
  currentEntries: KioskEntry[];
  nextEntries: KioskEntry[];
  lastUpdatedAt: string;
};

function formatEntry(entry: KioskEntry) {
  return [entry.schoolClass?.name ?? null, entry.teacher?.user.fullName ?? null, entry.room?.name ?? null]
    .filter(Boolean)
    .join(" / ");
}

export function ScheduleKioskScreen({
  locale,
  initialData
}: {
  locale: "ru" | "kz";
  initialData: KioskData;
}) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState(initialData.filters);
  const dayLabels = locale === "kz" ? ["Дс", "Сс", "Ср", "Бс", "Жм"] : ["Пн", "Вт", "Ср", "Чт", "Пт"];
  const copy =
    locale === "kz"
      ? {
          title: "Кесте kiosk режимі",
          subtitle: "Тақталар, теледидарлар және интерактивті экрандар үшін.",
          classLabel: "Сынып",
          teacherLabel: "Мұғалім",
          roomLabel: "Кабинет",
          dayLabel: "Күн",
          all: "Барлығы",
          dayView: "Күн",
          weekView: "Апта",
          current: "Қазір",
          next: "Келесі",
          refresh: "Жаңарту",
          fullscreen: "Толық экран",
          updated: "Жаңартылды",
          nothing: "Сабақ жоқ",
          autoRefresh: "Автожаңарту 30 секунд сайын"
        }
      : {
          title: "Kiosk-режим расписания",
          subtitle: "Для интерактивных досок, телевизоров и больших экранов.",
          classLabel: "Класс",
          teacherLabel: "Учитель",
          roomLabel: "Кабинет",
          dayLabel: "День",
          all: "Все",
          dayView: "День",
          weekView: "Неделя",
          current: "Сейчас",
          next: "Далее",
          refresh: "Обновить",
          fullscreen: "Во весь экран",
          updated: "Обновлено",
          nothing: "Нет уроков",
          autoRefresh: "Автообновление каждые 30 секунд"
        };

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setIsRefreshing(true);
        const params = new URLSearchParams();
        if (filters.classId) params.set("classId", filters.classId);
        if (filters.teacherId) params.set("teacherId", filters.teacherId);
        if (filters.roomId) params.set("roomId", filters.roomId);
        if (filters.dayOfWeek) params.set("dayOfWeek", String(filters.dayOfWeek));
        params.set("schoolYear", filters.schoolYear);
        params.set("term", filters.term);

        const response = await fetch(`/api/kiosk/schedule?${params.toString()}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          return;
        }

        const next = (await response.json()) as KioskData;
        if (active) {
          setData(next);
        }
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [filters]);

  async function handleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      return;
    }

    await document.exitFullscreen?.();
  }

  const selectedDay = viewMode === "day" ? filters.dayOfWeek : null;

  return (
    <main className="min-h-screen bg-[#07152f] px-4 py-4 text-white sm:px-6 sm:py-6 xl:px-8">
      <div className="mx-auto max-w-[1880px] space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur xl:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                {copy.autoRefresh}
              </div>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl xl:text-4xl">{copy.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70 xl:text-base">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                onClick={() => setFilters((current) => ({ ...current }))}
              >
                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span>{copy.refresh}</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                onClick={() => void handleFullscreen()}
              >
                <Maximize2 className="h-4 w-4" />
                <span>{copy.fullscreen}</span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur xl:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-2 text-sm">
                <span className="text-white/55">{copy.classLabel}</span>
                <select
                  className="w-full rounded-2xl border border-white/15 bg-[#0d2149] px-3 py-3 text-white"
                  value={filters.classId ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value || null }))}
                >
                  <option value="">{copy.all}</option>
                  {data.filterOptions.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-white/55">{copy.teacherLabel}</span>
                <select
                  className="w-full rounded-2xl border border-white/15 bg-[#0d2149] px-3 py-3 text-white"
                  value={filters.teacherId ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, teacherId: event.target.value || null }))}
                >
                  <option value="">{copy.all}</option>
                  {data.filterOptions.teachers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-white/55">{copy.roomLabel}</span>
                <select
                  className="w-full rounded-2xl border border-white/15 bg-[#0d2149] px-3 py-3 text-white"
                  value={filters.roomId ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, roomId: event.target.value || null }))}
                >
                  <option value="">{copy.all}</option>
                  {data.filterOptions.rooms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-white/55">{copy.dayLabel}</span>
                <select
                  className="w-full rounded-2xl border border-white/15 bg-[#0d2149] px-3 py-3 text-white"
                  value={filters.dayOfWeek}
                  onChange={(event) => setFilters((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}
                >
                  {Array.from({ length: 5 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>
                      {dayLabels[day - 1] ?? day}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-2 text-sm">
                <span className="text-white/55">Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-2xl px-3 py-3 font-semibold",
                      viewMode === "day" ? "bg-white text-[#07152f]" : "border border-white/15 bg-white/5 text-white"
                    )}
                    onClick={() => setViewMode("day")}
                  >
                    {copy.dayView}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-2xl px-3 py-3 font-semibold",
                      viewMode === "week" ? "bg-white text-[#07152f]" : "border border-white/15 bg-white/5 text-white"
                    )}
                    onClick={() => setViewMode("week")}
                  >
                    {copy.weekView}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {[{ label: copy.current, entries: data.currentEntries }, { label: copy.next, entries: data.nextEntries }].map((card) => (
              <section key={card.label} className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur xl:p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{card.label}</div>
                <div className="mt-3 space-y-3">
                  {card.entries.length ? (
                    card.entries.map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"
                      >
                        <div className="text-xl font-semibold xl:text-2xl">{entry.title}</div>
                        <div className="mt-2 text-sm leading-6 text-white/75 xl:text-base">{formatEntry(entry) || copy.nothing}</div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-white/55">
                      {copy.nothing}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur xl:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/65">
            <div>
              {copy.updated}: {new Date(data.lastUpdatedAt).toLocaleTimeString()}
            </div>
            <div>
              {data.currentTime}
            </div>
          </div>
          <ScheduleResponsiveGrid
            locale={locale}
            entries={data.entries}
            timeSlots={data.timeSlots}
            mode="kiosk"
            focusDay={selectedDay}
            highlightedSlot={
              data.currentSlot
                ? {
                    dayOfWeek: data.currentDayOfWeek,
                    slotNumber: data.currentSlot
                  }
                : null
            }
          />
        </section>
      </div>
    </main>
  );
}
