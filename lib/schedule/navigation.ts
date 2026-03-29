export type ScheduleSectionKey =
  | "overview"
  | "grid"
  | "generator"
  | "manual"
  | "conflicts"
  | "replacements"
  | "teachers"
  | "rooms"
  | "time-slots"
  | "templates"
  | "change-log";

export const scheduleSectionItems: Array<{
  key: ScheduleSectionKey;
  href: string;
}> = [
  { key: "overview", href: "/admin/schedule" },
  { key: "grid", href: "/admin/schedule/grid" },
  { key: "generator", href: "/admin/schedule/generator" },
  { key: "manual", href: "/admin/schedule/manual" },
  { key: "conflicts", href: "/admin/schedule/conflicts" },
  { key: "replacements", href: "/admin/schedule/replacements" },
  { key: "teachers", href: "/admin/schedule/teachers" },
  { key: "rooms", href: "/admin/schedule/rooms" },
  { key: "time-slots", href: "/admin/schedule/time-slots" },
  { key: "templates", href: "/admin/schedule/templates" },
  { key: "change-log", href: "/admin/schedule/change-log" }
];

export function getScheduleSectionCopy(locale: "ru" | "kz") {
  return locale === "kz"
    ? {
        section: "Кесте",
        overview: "Шолу",
        grid: "Тор",
        generator: "Генератор",
        manual: "Қолмен жинау",
        conflicts: "Конфликттер",
        replacements: "Ауыстырулар",
        teachers: "Мұғалімдер",
        rooms: "Кабинеттер",
        "time-slots": "Уақыт слоттары",
        templates: "Үлгілер",
        "change-log": "Өзгерістер журналы"
      }
    : {
        section: "Расписание",
        overview: "Overview",
        grid: "Grid",
        generator: "Generator",
        manual: "Manual Builder",
        conflicts: "Conflicts",
        replacements: "Replacements",
        teachers: "Teachers",
        rooms: "Rooms",
        "time-slots": "Time Slots",
        templates: "Templates",
        "change-log": "Changes Log"
      };
}
