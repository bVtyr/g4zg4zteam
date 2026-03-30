export type ScheduleSectionKey =
  | "overview"
  | "grid"
  | "generator"
  | "resources"
  | "conflicts";

export const scheduleSectionItems: Array<{
  key: ScheduleSectionKey;
  href: string;
}> = [
  { key: "overview", href: "/admin/schedule" },
  { key: "generator", href: "/admin/schedule/generator" },
  { key: "grid", href: "/admin/schedule/grid" },
  { key: "resources", href: "/admin/schedule/resources" },
  { key: "conflicts", href: "/admin/schedule/conflicts" }
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
        resources: "Resources",
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
