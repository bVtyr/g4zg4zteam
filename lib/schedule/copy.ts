import {
  RoomType,
  ScheduleChangeReason,
  ScheduleConflictSeverity,
  ScheduleConflictType,
  ScheduleEntryType
} from "@prisma/client";
import type { Locale } from "@/lib/i18n";

const sharedCopy = {
  overview: {
    title: "Smart Schedule",
    subtitle: "Генерация, публикация, ручные правки, конфликты и замены в одном рабочем контуре.",
    quick: "Быстрые разделы",
    recentConflicts: "Критичные конфликты",
    recentChanges: "Последние изменения",
    cards: {
      grid: ["Сетка", "Просмотр по классам, учителям и кабинетам с ручной правкой."],
      generator: ["Генератор", "Draft-генерация, preview, сравнение и публикация."],
      manual: ["Ручная правка", "Точечные изменения без потери locked и manual записей."],
      replacements: ["Замены", "Отсутствия, замены и перестройка расписания по дню."],
      teachers: ["Учителя", "Нагрузка, доступность и права на замену."],
      rooms: ["Кабинеты", "Вместимость, пригодность и доступность помещений."]
    }
  },
  grid: {
    title: "Сетка расписания",
    subtitle: "Единая сетка по слотам с фильтрами и ручным переносом уроков.",
    filters: "Фильтры",
    table: "Рабочая сетка"
  },
  generator: {
    title: "Генератор расписания",
    subtitle: "Черновая генерация с проверкой ограничений, конфликтов и неразмещённых уроков.",
    panel: "Параметры генерации",
    logs: "История запусков"
  },
  manual: {
    title: "Ручная правка",
    subtitle: "Точечное создание и редактирование записей с валидацией конфликтов.",
    editor: "Редактор записи",
    snapshot: "Текущая сетка"
  },
  replacements: {
    title: "Замены и отсутствия",
    subtitle: "Preview по отсутствию учителя, поиск замены и список изменений до публикации.",
    panel: "Панель замены",
    changes: "Изменения по расписанию"
  },
  teachers: {
    title: "Учителя",
    subtitle: "Профили учителей, доступность, нагрузка и настройки замены.",
    form: "Новый учитель",
    table: "Список учителей"
  },
  rooms: {
    title: "Кабинеты",
    subtitle: "Каталог кабинетов, пригодность по предметам и доступность по слотам.",
    form: "Новый кабинет",
    table: "Список кабинетов"
  },
  templates: {
    title: "Шаблоны нагрузки",
    subtitle: "Недельная нагрузка и запросы, из которых генератор собирает расписание.",
    table: "Запросы на генерацию"
  },
  timeSlots: {
    title: "Слоты",
    subtitle: "Школьная сетка звонков и активных учебных интервалов.",
    table: "Редактор слотов"
  },
  conflicts: {
    title: "Конфликты",
    subtitle: "Критичные и предупреждающие конфликты по учителям, кабинетам и классам.",
    table: "Лента конфликтов"
  },
  changeLog: {
    title: "Журнал изменений",
    subtitle: "Все переносы, замены и ручные вмешательства в одном потоке.",
    table: "История изменений"
  }
} as const;

export const schedulePageCopy = {
  ru: sharedCopy,
  kz: sharedCopy
} as const;

export function getScheduleSectionCopy(_: Locale) {
  return {
    section: "Расписание",
    overview: "Обзор",
    grid: "Сетка",
    generator: "Генератор",
    manual: "Ручная правка",
    conflicts: "Конфликты",
    replacements: "Замены",
    teachers: "Учителя",
    rooms: "Кабинеты",
    "time-slots": "Слоты",
    templates: "Шаблоны",
    "change-log": "Журнал"
  };
}

export function getScheduleDayLabels(_: Locale) {
  return ["Пн", "Вт", "Ср", "Чт", "Пт"];
}

export function getScheduleEntryTypeLabel(_: Locale, type: ScheduleEntryType) {
  const labels: Record<ScheduleEntryType, string> = {
    lesson: "Урок",
    pair: "Пара",
    double_lesson: "Двойной урок",
    academic_hour: "Академический час",
    event: "Событие",
    stream: "Поток",
    ribbon: "Лента",
    ribbon_group: "Группа ленты",
    homeroom: "Классный час",
    self_study: "Самоподготовка"
  };

  return labels[type];
}

export function getScheduleConflictTypeLabel(_: Locale, type: ScheduleConflictType) {
  const labels: Record<ScheduleConflictType, string> = {
    teacher_overlap: "Учитель занят в двух уроках",
    room_overlap: "Кабинет занят дважды",
    class_overlap: "Класс пересекается",
    teacher_unavailable: "Учитель недоступен",
    room_unavailable: "Кабинет недоступен",
    invalid_subject_assignment: "Недопустимое назначение предмета",
    broken_locked_entry: "Locked-запись заполнена не полностью",
    replacement_not_found: "Замена не найдена",
    room_suitability: "Кабинет не подходит"
  };

  return labels[type];
}

export function getScheduleConflictSeverityLabel(_: Locale, severity: ScheduleConflictSeverity) {
  const labels: Record<ScheduleConflictSeverity, string> = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
    critical: "Критичный"
  };

  return labels[severity];
}

export function getScheduleChangeReasonLabel(_: Locale, reason: ScheduleChangeReason) {
  const labels: Record<ScheduleChangeReason, string> = {
    teacher_absence: "Отсутствие учителя",
    manual_adjustment: "Ручная правка",
    event_override: "Событие заменило урок",
    imported_from_excel: "Импорт из Excel",
    generator_rebuild: "Пересборка генератором",
    replacement_assignment: "Назначение замены"
  };

  return labels[reason];
}

export function getRoomTypeLabel(_: Locale, type: RoomType) {
  const labels: Record<RoomType, string> = {
    standard: "Стандартный",
    lab: "Лаборатория",
    gym: "Спортзал",
    assembly: "Актовый зал",
    library: "Библиотека",
    coworking: "Коворкинг",
    outdoor: "Открытая площадка"
  };

  return labels[type];
}

