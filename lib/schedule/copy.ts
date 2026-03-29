import {
  RoomType,
  ScheduleChangeReason,
  ScheduleConflictSeverity,
  ScheduleConflictType,
  ScheduleEntryType
} from "@prisma/client";
import type { Locale } from "@/lib/i18n";

export const schedulePageCopy = {
  ru: {
    overview: {
      title: "Модуль расписания",
      subtitle:
        "Рабочий центр управления расписанием: автоматическая генерация, ручная сборка, конфликты, замены и справочники.",
      quick: "Быстрые разделы",
      recentConflicts: "Критичные конфликты",
      recentChanges: "Последние изменения",
      cards: {
        grid: ["Сетка расписания", "Просмотр по классам, учителям и кабинетам."],
        generator: ["Генератор", "Автосборка расписания, пробный запуск и импорт Excel."],
        manual: ["Ручная сборка", "Создание, правка, дублирование и фиксация записей."],
        replacements: ["Замены", "Отсутствия, подбор заменяющих и перестройка."],
        teachers: ["Учителя", "Профили учителей, доступность и права на замену."],
        rooms: ["Кабинеты", "Каталог кабинетов, вместимость и пригодность."]
      }
    },
    grid: {
      title: "Сетка расписания",
      subtitle: "Недельный обзор расписания по нормализованной школьной сетке.",
      filters: "Фильтры",
      table: "Недельная сетка"
    },
    generator: {
      title: "Генератор расписания",
      subtitle: "Автогенерация и пробный запуск без обязательной загрузки файлов.",
      panel: "Генерация и импорт",
      logs: "Последние изменения"
    },
    manual: {
      title: "Ручная сборка",
      subtitle: "Создавайте и фиксируйте уроки вручную, не ломая ограничения генератора.",
      editor: "Создание записи",
      snapshot: "Текущая сетка"
    },
    replacements: {
      title: "Замены и отсутствия",
      subtitle: "Просмотр последствий отсутствия учителя до применения изменений.",
      panel: "Панель отсутствий",
      changes: "Последние изменения"
    },
    teachers: {
      title: "Учителя",
      subtitle: "Управление учителями как сущностями расписания: нагрузка, активность, замены, доступность.",
      form: "Добавить учителя",
      table: "Справочник учителей"
    },
    rooms: {
      title: "Кабинеты",
      subtitle: "Каталог кабинетов, вместимость, пригодность по предметам и готовность к мероприятиям.",
      form: "Добавить кабинет",
      table: "Каталог кабинетов"
    },
    templates: {
      title: "Шаблоны нагрузки",
      subtitle: "Шаблоны недельной нагрузки, из которых генератор строит валидную сетку.",
      table: "Шаблоны генерации"
    },
    timeSlots: {
      title: "Временные слоты",
      subtitle: "Школьная временная сетка: начало, окончание, перерывы и активные интервалы.",
      table: "Редактор слотов"
    },
    conflicts: {
      title: "Конфликты расписания",
      subtitle: "Все конфликты по учителям, кабинетам, классам и доступности в одной очереди.",
      table: "Список конфликтов"
    },
    changeLog: {
      title: "Журнал изменений",
      subtitle: "Все переносы, замены и ручные вмешательства в единой журналируемой ленте.",
      table: "Журнал расписания"
    }
  },
  kz: {
    overview: {
      title: "Сабақ кестесі модулі",
      subtitle:
        "Кестені басқарудың жұмыс орталығы: автоматты генерация, қолмен жинау, конфликттер, ауыстырулар және анықтамалықтар.",
      quick: "Жылдам бөлімдер",
      recentConflicts: "Маңызды конфликттер",
      recentChanges: "Соңғы өзгерістер",
      cards: {
        grid: ["Кесте торы", "Сынып, мұғалім және кабинет бойынша қарау."],
        generator: ["Генератор", "Автоматты құрастыру, алдын ала тексеру және Excel импорт."],
        manual: ["Қолмен жинау", "Жазбаларды құру, түзету, көшіру және бекіту."],
        replacements: ["Ауыстырулар", "Мұғалімнің жоқ болуы және ауыстыруды қайта есептеу."],
        teachers: ["Мұғалімдер", "Мұғалім профилі, қолжетімділік және ауыстыру құқығы."],
        rooms: ["Кабинеттер", "Кабинет каталогы, сыйымдылық және жарамдылық."]
      }
    },
    grid: {
      title: "Кесте торы",
      subtitle: "Нормаланған мектеп торы бойынша апталық кесте көрінісі.",
      filters: "Сүзгілер",
      table: "Апталық тор"
    },
    generator: {
      title: "Кесте генераторы",
      subtitle: "Файл жүктемей-ақ автоматты генерация және алдын ала тексеру.",
      panel: "Генерация және импорт",
      logs: "Соңғы өзгерістер"
    },
    manual: {
      title: "Қолмен құрастыру",
      subtitle: "Генератордың шектеулерін сақтай отырып, сабақтарды қолмен қойыңыз.",
      editor: "Жазба құру",
      snapshot: "Ағымдағы тор"
    },
    replacements: {
      title: "Ауыстырулар мен жоқ болулар",
      subtitle: "Мұғалім жоқ болғандағы өзгерістерді қолданар алдында алдын ала көру.",
      panel: "Жоқ болу панелі",
      changes: "Соңғы өзгерістер"
    },
    teachers: {
      title: "Мұғалімдер",
      subtitle: "Мұғалімдерді кесте объектісі ретінде басқару: жүктеме, белсенділік, ауыстыру, қолжетімділік.",
      form: "Мұғалім қосу",
      table: "Мұғалімдер анықтамалығы"
    },
    rooms: {
      title: "Кабинеттер",
      subtitle: "Кабинеттер каталогы, сыйымдылық, пәнге жарамдылық және іс-шараға дайындығы.",
      form: "Кабинет қосу",
      table: "Кабинеттер каталогы"
    },
    templates: {
      title: "Жүктеме үлгілері",
      subtitle: "Генератор валидті кесте құратын апталық жүктеме үлгілері.",
      table: "Генерация үлгілері"
    },
    timeSlots: {
      title: "Уақыт слоттары",
      subtitle: "Мектептің уақыт торы: басталу, аяқталу, үзіліс және белсенді интервалдар.",
      table: "Слоттар редакторы"
    },
    conflicts: {
      title: "Кесте конфликттері",
      subtitle: "Мұғалім, кабинет, сынып және қолжетімділік конфликттері бір тізімде.",
      table: "Конфликттер тізімі"
    },
    changeLog: {
      title: "Өзгерістер журналы",
      subtitle: "Барлық ауыстыру, жылжыту және қолмен түзету бір журналда сақталады.",
      table: "Кесте журналы"
    }
  }
} as const;

export function getScheduleSectionCopy(locale: Locale) {
  return locale === "kz"
    ? {
        section: "Сабақ кестесі",
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
        overview: "Обзор",
        grid: "Сетка",
        generator: "Генератор",
        manual: "Ручная сборка",
        conflicts: "Конфликты",
        replacements: "Замены",
        teachers: "Учителя",
        rooms: "Кабинеты",
        "time-slots": "Временные слоты",
        templates: "Шаблоны",
        "change-log": "Журнал изменений"
      };
}

export function getScheduleDayLabels(locale: Locale) {
  return locale === "kz" ? ["Дс", "Сс", "Ср", "Бс", "Жм"] : ["Пн", "Вт", "Ср", "Чт", "Пт"];
}

export function getScheduleEntryTypeLabel(locale: Locale, type: ScheduleEntryType) {
  const labels: Record<Locale, Record<ScheduleEntryType, string>> = {
    ru: {
      lesson: "урок",
      pair: "пара",
      double_lesson: "двойной урок",
      academic_hour: "академический час",
      event: "событие",
      stream: "поток",
      ribbon: "лента",
      ribbon_group: "группа ленты",
      homeroom: "классный час",
      self_study: "самоподготовка"
    },
    kz: {
      lesson: "сабақ",
      pair: "қос сабақ",
      double_lesson: "ұзартылған сабақ",
      academic_hour: "академиялық сағат",
      event: "іс-шара",
      stream: "ағын",
      ribbon: "лента",
      ribbon_group: "лента тобы",
      homeroom: "тәрбие сағаты",
      self_study: "өздік жұмыс"
    }
  };

  return labels[locale][type];
}

export function getScheduleConflictTypeLabel(locale: Locale, type: ScheduleConflictType) {
  const labels: Record<Locale, Record<ScheduleConflictType, string>> = {
    ru: {
      teacher_overlap: "Пересечение учителя",
      room_overlap: "Пересечение кабинета",
      class_overlap: "Пересечение класса",
      teacher_unavailable: "Учитель недоступен",
      room_unavailable: "Кабинет недоступен",
      invalid_subject_assignment: "Некорректное назначение предмета",
      broken_locked_entry: "Неполная зафиксированная запись",
      replacement_not_found: "Замена не найдена",
      room_suitability: "Кабинет не подходит"
    },
    kz: {
      teacher_overlap: "Мұғалім қабаттасуы",
      room_overlap: "Кабинет қабаттасуы",
      class_overlap: "Сынып қабаттасуы",
      teacher_unavailable: "Мұғалім қолжетімсіз",
      room_unavailable: "Кабинет қолжетімсіз",
      invalid_subject_assignment: "Пән тағайындауы қате",
      broken_locked_entry: "Бекітілген жазба толық емес",
      replacement_not_found: "Ауыстыру табылмады",
      room_suitability: "Кабинет сәйкес емес"
    }
  };

  return labels[locale][type];
}

export function getScheduleConflictSeverityLabel(locale: Locale, severity: ScheduleConflictSeverity) {
  const labels: Record<Locale, Record<ScheduleConflictSeverity, string>> = {
    ru: {
      low: "Низкая",
      medium: "Средняя",
      high: "Высокая",
      critical: "Критичная"
    },
    kz: {
      low: "Төмен",
      medium: "Орташа",
      high: "Жоғары",
      critical: "Критикалық"
    }
  };

  return labels[locale][severity];
}

export function getScheduleChangeReasonLabel(locale: Locale, reason: ScheduleChangeReason) {
  const labels: Record<Locale, Record<ScheduleChangeReason, string>> = {
    ru: {
      teacher_absence: "Отсутствие учителя",
      manual_adjustment: "Ручная правка",
      event_override: "Замещение событием",
      imported_from_excel: "Импорт из Excel",
      generator_rebuild: "Пересборка генератором",
      replacement_assignment: "Назначение замены"
    },
    kz: {
      teacher_absence: "Мұғалімнің жоқ болуы",
      manual_adjustment: "Қолмен түзету",
      event_override: "Іс-шарамен ауыстыру",
      imported_from_excel: "Excel импорт",
      generator_rebuild: "Генератор арқылы қайта құру",
      replacement_assignment: "Ауыстыруды тағайындау"
    }
  };

  return labels[locale][reason];
}

export function getRoomTypeLabel(locale: Locale, type: RoomType) {
  const labels: Record<Locale, Record<RoomType, string>> = {
    ru: {
      standard: "Стандартный",
      lab: "Лаборатория",
      gym: "Спортзал",
      assembly: "Актовый зал",
      library: "Библиотека",
      coworking: "Коворкинг",
      outdoor: "Открытая площадка"
    },
    kz: {
      standard: "Стандартты",
      lab: "Зертхана",
      gym: "Спортзал",
      assembly: "Акт залы",
      library: "Кітапхана",
      coworking: "Коворкинг",
      outdoor: "Ашық алаң"
    }
  };

  return labels[locale][type];
}
