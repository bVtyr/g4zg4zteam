import { Role, ScoreType, TrendLabel } from "@prisma/client";

export const LOCALE_COOKIE = "aq_locale";
export const locales = ["ru", "kz"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ru" || value === "kz";
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : "ru";
}

export const dictionary = {
  ru: {
    appName: "Aqbobek Lyceum",
    appSubtitle: "Образовательный портал",
    secureSpace: "Единая цифровая среда школы",
    language: "Язык",
    localeName: { ru: "Русский", kz: "Қазақша" },
    nav: {
      dashboard: "Главная",
      portfolio: "Портфолио",
      schedule: "Расписание",
      notifications: "Уведомления",
      kiosk: "Экран"
    },
    role: {
      student: "Ученик",
      teacher: "Учитель",
      parent: "Родитель",
      admin: "Администратор"
    },
    shell: {
      logout: "Выйти",
      overview: "Обзор",
      schoolSpace: "Единая среда обучения, расписания, аналитики и школьных коммуникаций."
    },
    login: {
      badge: "Aqbobek Lyceum",
      title: "Цифровая среда лицея для обучения, аналитики и школьного управления.",
      subtitle:
        "Оценки, посещаемость, портфолио, уведомления, расписание и аналитика доступны в одном защищенном кабинете.",
      features: [
        "Безопасный вход по роли",
        "Академическая аналитика и риски",
        "Интеграция BilimClass и расписание"
      ],
      formBadge: "Вход в систему",
      signIn: "Войти",
      username: "Логин",
      password: "Пароль",
      submit: "Войти",
      submitting: "Вход...",
      invalid: "Не удалось выполнить вход. Проверьте логин и пароль.",
      testAccounts: "Тестовые аккаунты",
      loading: "Загрузка формы..."
    },
    student: {
      title: "Кабинет ученика",
      subtitle: "Успеваемость, посещаемость, AI-подсказки, портфолио и учебные цели в одном кабинете.",
      tutorAdvice: "Рекомендации AI-тьютора",
      weeklySummary: "Итоги недели",
      gamification: "Мотивация",
      streak: "Серия",
      leaderboardRank: "Место в рейтинге",
      points: "Баллы"
    },
    teacher: {
      title: "Кабинет учителя",
      subtitle: "Ранняя диагностика рисков, аналитика класса, таблица успеваемости и AI-отчет.",
      report: "AI-отчет по классу",
      performanceView: "Успеваемость класса",
      student: "Ученик",
      highestRisk: "Предмет с максимальным риском",
      reason: "Причина",
      misses: "Пропуски"
    },
    parent: {
      title: "Кабинет родителя",
      subtitle: "Оценки, посещаемость, достижения ребенка и понятная еженедельная сводка.",
      weeklySummary: "AI-сводка за неделю",
      missesSuffix: "пропусков"
    },
    admin: {
      title: "Панель администрации",
      subtitle: "Сводная академическая картина школы, уведомления, события и управление расписанием.",
      classes: "Классы",
      students: "Ученики",
      riskShare: "Доля риска",
      misses: "Пропуски",
      performanceByClass: "Успеваемость по классам",
      performanceBySubject: "Успеваемость по предметам",
      schoolFeed: "Школьная лента"
    },
    portfolio: {
      title: "Цифровое портфолио",
      subtitle: "Подтвержденные достижения, сертификаты и участие во внеучебной жизни.",
      achievements: "Достижения",
      certificates: "Сертификаты",
      items: "Портфолио"
    },
    schedule: {
      title: "Расписание",
      subtitle: "Недельное расписание уроков, пар, академических часов, мероприятий и потоковых занятий.",
      replacement: "замена",
      days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    },
    notifications: {
      title: "Уведомления",
      subtitle: "Адресные сообщения по ролям, классам и общешкольным обновлениям.",
      read: "прочитано",
      unread: "новое"
    },
    kiosk: {
      mode: "Информационный экран",
      autoRefresh: "Автообновление: 30 сек",
      title: "Школьный экран",
      topStudents: "Лучшие ученики дня",
      announcements: "Объявления",
      changes: "Изменения в расписании",
      allClasses: "Все классы",
      upcomingEvents: "Ближайшие события",
      campus: "Кампус",
      points: "баллов"
    },
    common: {
      attendance: "Посещаемость",
      totalMisses: "Всего пропусков",
      unexcused: "Без причины",
      average: "Средний результат",
      probabilityFail: "Риск неуспеха",
      trend: "Тренд",
      notAvailable: "Н/Д",
      saved: "Сохранено",
      failed: "Ошибка",
      publish: "Опубликовать",
      title: "Заголовок",
      message: "Сообщение",
      status: "Статус",
      subject: "Предмет",
      class: "Класс",
      risk: "Риск"
    },
    composer: {
      title: "Центр уведомлений",
      subtitle: "Создавайте объявления по ролям, классам, параллелям или на всю школу.",
      scopeSchool: "Вся школа",
      scopeClass: "Класс",
      scopeRole: "Роль",
      scopeParallel: "Параллель",
      noClass: "Без класса"
    }
  },
  kz: {
    appName: "Aqbobek Lyceum",
    appSubtitle: "Білім порталы",
    secureSpace: "Мектептің бірыңғай цифрлық ортасы",
    language: "Тіл",
    localeName: { ru: "Русский", kz: "Қазақша" },
    nav: {
      dashboard: "Басты бет",
      portfolio: "Портфолио",
      schedule: "Сабақ кестесі",
      notifications: "Хабарламалар",
      kiosk: "Экран"
    },
    role: {
      student: "Оқушы",
      teacher: "Мұғалім",
      parent: "Ата-ана",
      admin: "Әкімші"
    },
    shell: {
      logout: "Шығу",
      overview: "Шолу",
      schoolSpace: "Оқу, кесте, аналитика және мектеп коммуникацияларының біртұтас ортасы."
    },
    login: {
      badge: "Aqbobek Lyceum",
      title: "Оқу, талдау және мектеп басқаруына арналған лицейдің цифрлық ортасы.",
      subtitle:
        "Бағалар, қатысу, портфолио, хабарламалар, кесте және аналитика бір қорғалған кабинетте біріктірілген.",
      features: [
        "Рөл бойынша қауіпсіз кіру",
        "Академиялық аналитика және тәуекелдер",
        "BilimClass интеграциясы және кесте"
      ],
      formBadge: "Жүйеге кіру",
      signIn: "Кіру",
      username: "Логин",
      password: "Құпиясөз",
      submit: "Кіру",
      submitting: "Кіру...",
      invalid: "Кіру орындалмады. Логин мен құпиясөзді тексеріңіз.",
      testAccounts: "Тест аккаунттары",
      loading: "Форма жүктелуде..."
    },
    student: {
      title: "Оқушы кабинеті",
      subtitle: "Үлгерім, қатысу, AI-ұсыныстар, портфолио және оқу мақсаттары бір жерде.",
      tutorAdvice: "AI-тьютор ұсыныстары",
      weeklySummary: "Апталық қорытынды",
      gamification: "Мотивация",
      streak: "Серия",
      leaderboardRank: "Рейтингтегі орны",
      points: "Ұпай"
    },
    teacher: {
      title: "Мұғалім кабинеті",
      subtitle: "Тәуекелдерді ерте анықтау, сынып аналитикасы, үлгерім кестесі және AI-есеп.",
      report: "Сынып бойынша AI-есеп",
      performanceView: "Сынып үлгерімі",
      student: "Оқушы",
      highestRisk: "Тәуекелі ең жоғары пән",
      reason: "Себеп",
      misses: "Қатыспау"
    },
    parent: {
      title: "Ата-ана кабинеті",
      subtitle: "Балаңыздың бағалары, қатысуы, жетістіктері және түсінікті апталық қорытынды.",
      weeklySummary: "Апталық AI-қорытынды",
      missesSuffix: "сабақ босату"
    },
    admin: {
      title: "Әкімшілік панелі",
      subtitle: "Мектептің академиялық көрінісі, хабарламалар, оқиғалар және кестені басқару.",
      classes: "Сыныптар",
      students: "Оқушылар",
      riskShare: "Тәуекел үлесі",
      misses: "Қатыспау",
      performanceByClass: "Сыныптар бойынша үлгерім",
      performanceBySubject: "Пәндер бойынша үлгерім",
      schoolFeed: "Мектеп лентасы"
    },
    portfolio: {
      title: "Цифрлық портфолио",
      subtitle: "Расталған жетістіктер, сертификаттар және мектептен тыс белсенділік.",
      achievements: "Жетістіктер",
      certificates: "Сертификаттар",
      items: "Портфолио"
    },
    schedule: {
      title: "Сабақ кестесі",
      subtitle: "Сабақтар, қос сабақтар, академиялық сағаттар, іс-шаралар және ағындық топтар кестесі.",
      replacement: "ауыстыру",
      days: ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"]
    },
    notifications: {
      title: "Хабарламалар",
      subtitle: "Рөлдерге, сыныптарға және бүкіл мектепке арналған бағытталған хабарламалар.",
      read: "оқылған",
      unread: "жаңа"
    },
    kiosk: {
      mode: "Ақпараттық экран",
      autoRefresh: "Автожаңарту: 30 сек",
      title: "Мектеп экраны",
      topStudents: "Күннің үздік оқушылары",
      announcements: "Хабарландырулар",
      changes: "Кестедегі өзгерістер",
      allClasses: "Барлық сынып",
      upcomingEvents: "Алдағы іс-шаралар",
      campus: "Кампус",
      points: "ұпай"
    },
    common: {
      attendance: "Қатысу",
      totalMisses: "Жалпы босатулар",
      unexcused: "Себепсіз",
      average: "Орташа нәтиже",
      probabilityFail: "Сәтсіздік ықтималдығы",
      trend: "Тренд",
      notAvailable: "Жоқ",
      saved: "Сақталды",
      failed: "Қате",
      publish: "Жариялау",
      title: "Тақырып",
      message: "Хабарлама",
      status: "Мәртебе",
      subject: "Пән",
      class: "Сынып",
      risk: "Тәуекел"
    },
    composer: {
      title: "Хабарламалар орталығы",
      subtitle: "Рөлдерге, сыныптарға, параллельдерге немесе бүкіл мектепке хабарлама жасаңыз.",
      scopeSchool: "Бүкіл мектеп",
      scopeClass: "Сынып",
      scopeRole: "Рөл",
      scopeParallel: "Параллель",
      noClass: "Сыныпсыз"
    }
  }
} as const;

export function getDictionary(locale: Locale) {
  return dictionary[locale];
}

const subjectTranslations: Record<string, Record<Locale, string>> = {
  Physics: { ru: "Физика", kz: "Физика" },
  Algebra: { ru: "Алгебра", kz: "Алгебра" },
  Informatics: { ru: "Информатика", kz: "Информатика" },
  English: { ru: "Английский язык", kz: "Ағылшын тілі" },
  "Physical Education": { ru: "Физическая культура", kz: "Дене шынықтыру" },
  Homeroom: { ru: "Классный час", kz: "Сынып сағаты" },
  "Informatics Stream A": { ru: "Поток по информатике A", kz: "Информатика ағыны A" },
  "English Double": { ru: "Английский язык: пара", kz: "Ағылшын тілі: қос сабақ" },
  "Assembly: University Track": { ru: "Сбор: траектория вуза", kz: "Жиын: университет бағыты" }
};

const contentTranslations: Record<string, Record<Locale, string>> = {
  "Regional Physics Olympiad": { ru: "Региональная олимпиада по физике", kz: "Физикадан өңірлік олимпиада" },
  "regional silver": { ru: "серебро регионального уровня", kz: "өңірлік деңгейдегі күміс" },
  "Robotics Club Demo Day": { ru: "День демонстрации робототехника клубы", kz: "Робототехника клубының таныстыру күні" },
  "AI Literacy Bootcamp": { ru: "Интенсив по AI literacy", kz: "AI literacy интенсиві" },
  "STEM Research Club": { ru: "STEM зерттеу клубы", kz: "STEM зерттеу клубы" },
  "Peer Math Mentoring": { ru: "Математика бойынша peer mentoring", kz: "Математика бойынша peer mentoring" },
  club: { ru: "клуб", kz: "клуб" },
  volunteering: { ru: "волонтерство", kz: "еріктілік" },
  "Raise Physics final score to 85+": { ru: "Поднять итог по физике до 85+", kz: "Физика бойынша қорытындыны 85+ деңгейіне жеткізу" },
  "Zero unexcused absences next month": { ru: "Ноль пропусков без причины в следующем месяце", kz: "Келесі айда себепсіз босатуларды нөлге жеткізу" },
  "Science Sprint": { ru: "Science Sprint", kz: "Science Sprint" },
  "Portfolio Pro": { ru: "Portfolio Pro", kz: "Portfolio Pro" },
  "High momentum in STEM subjects": { ru: "Сильная динамика по STEM-предметам", kz: "STEM пәндері бойынша жоғары қарқын" },
  "Verified achievements and certificates": { ru: "Подтвержденные достижения и сертификаты", kz: "Расталған жетістіктер мен сертификаттар" },
  "AIS Hack 3.0 Demo Rehearsal": { ru: "Репетиция презентаций AIS Hack 3.0", kz: "AIS Hack 3.0 таныстырылым репетициясы" },
  "Final rehearsal in the assembly hall for all finalists.": {
    ru: "Финальная репетиция в актовом зале для всех финалистов.",
    kz: "Барлық финалистерге арналған акт залындағы соңғы репетиция."
  },
  "Physics consultation moved": { ru: "Консультация по физике перенесена", kz: "Физика бойынша консультация ауыстырылды" },
  "Today's physics consultation starts at 16:10 in Lab 301.": {
    ru: "Сегодняшняя консультация по физике начнется в 16:10 в лаборатории 301.",
    kz: "Бүгінгі физика консультациясы 16:10-да 301-зертханада басталады."
  },
  "Weekly attendance watch": { ru: "Недельный контроль посещаемости", kz: "Апталық қатысу бақылауы" },
  "Two students in 11 B exceeded the unexcused absence threshold.": {
    ru: "Два ученика 11 B превысили порог пропусков без причины.",
    kz: "11 B сыныбындағы екі оқушы себепсіз босату шегінен асты."
  },
  "Hackathon rehearsal reminder": { ru: "Напоминание о репетиции", kz: "Репетиция туралы еске салу" },
  "Hackathon rehearsal reminder starts soon. Bring your presentation decks.": {
    ru: "Репетиция скоро начнется. Подготовьте свои презентации.",
    kz: "Репетиция жақын арада басталады. Презентацияларыңызды дайындаңыз."
  }
};

export function translateSubject(locale: Locale, value: string) {
  return subjectTranslations[value]?.[locale] ?? value;
}

export function translateContent(locale: Locale, value: string | null | undefined) {
  if (!value) {
    return value ?? "";
  }

  return contentTranslations[value]?.[locale] ?? subjectTranslations[value]?.[locale] ?? value;
}

export function translateScoreType(locale: Locale, value: ScoreType) {
  const map = {
    ru: {
      mark: "оценка",
      credit: "зачет",
      no_score: "без оценки"
    },
    kz: {
      mark: "баға",
      credit: "сынақ",
      no_score: "бағасыз"
    }
  } as const;

  return map[locale][value];
}

export function translateTrend(locale: Locale, value: TrendLabel) {
  const map = {
    ru: {
      improving: "улучшается",
      stable: "стабильно",
      declining: "снижается",
      critical_decline: "критическое снижение"
    },
    kz: {
      improving: "жақсаруда",
      stable: "тұрақты",
      declining: "төмендеуде",
      critical_decline: "критикалық төмендеу"
    }
  } as const;

  return map[locale][value];
}

export function translateRiskStatus(locale: Locale, value: "strong" | "stable" | "risk") {
  const map = {
    ru: {
      strong: "сильная зона",
      stable: "стабильно",
      risk: "риск"
    },
    kz: {
      strong: "күшті аймақ",
      stable: "тұрақты",
      risk: "тәуекел"
    }
  } as const;

  return map[locale][value];
}

export function translateRole(locale: Locale, role: Role) {
  return dictionary[locale].role[role];
}
