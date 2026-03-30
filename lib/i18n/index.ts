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
    appSubtitle: "Цифровой школьный портал",
    secureSpace: "Единая среда для учебы, расписания и коммуникации",
    language: "Язык",
    localeName: { ru: "Русский", kz: "Қазақша" },
    nav: {
      dashboard: "Главная",
      portfolio: "Портфолио",
      schedule: "Расписание",
      notifications: "Уведомления",
      kiosk: "Kiosk"
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
      schoolSpace: "Оценки, риски, расписание, уведомления и ключевые школьные процессы в одном кабинете."
    },
    login: {
      badge: "Aqbobek Lyceum",
      title: "Лицей в одной цифровой среде.",
      subtitle:
        "Оценки, attendance, AI-аналитика, уведомления и smart schedule собраны в одном защищенном продукте.",
      features: [
        "Ролевой доступ для ученика, учителя, родителя и администрации",
        "AI-аналитика с понятными следующими шагами",
        "BilimClass sync, уведомления и smart schedule"
      ],
      formBadge: "Вход",
      signIn: "Войти",
      username: "Логин",
      password: "Пароль",
      submit: "Войти",
      submitting: "Входим...",
      invalid: "Не удалось войти. Проверьте логин и пароль.",
      testAccounts: "Демо-аккаунты",
      loading: "Загружаем форму..."
    },
    student: {
      title: "Кабинет ученика",
      subtitle: "Успеваемость, AI-подсказки, attendance, портфолио и связь с родителями в одном окне.",
      tutorAdvice: "AI-тьютор",
      weeklySummary: "Итоги недели",
      gamification: "Прогресс и мотивация",
      streak: "Серия",
      leaderboardRank: "Место в рейтинге",
      points: "Баллы"
    },
    teacher: {
      title: "Кабинет учителя",
      subtitle: "Риски по ученикам, картина по классу, attendance и готовый AI-отчет без лишнего шума.",
      report: "AI-отчет по классу",
      performanceView: "Срез по ученикам",
      student: "Ученик",
      highestRisk: "Главный риск",
      reason: "Причина",
      misses: "Пропуски"
    },
    parent: {
      title: "Кабинет родителя",
      subtitle: "Оценки, посещаемость, weekly digest и понятные сигналы по ребенку.",
      weeklySummary: "Сводка за неделю",
      missesSuffix: "пропусков"
    },
    admin: {
      title: "Панель администрации",
      subtitle: "Сводка по школе, риски, расписание, интеграции и операционный контроль.",
      classes: "Классы",
      students: "Ученики",
      riskShare: "Доля риска",
      misses: "Пропуски",
      performanceByClass: "Успеваемость по классам",
      performanceBySubject: "Успеваемость по предметам",
      schoolFeed: "Лента школы"
    },
    portfolio: {
      title: "Портфолио",
      subtitle: "Подтвержденные достижения, сертификаты и школьная активность.",
      achievements: "Достижения",
      certificates: "Сертификаты",
      items: "Активности"
    },
    schedule: {
      title: "Расписание",
      subtitle: "Недельное расписание, замены, пары, потоки, события и изменения по дням.",
      replacement: "Замена",
      days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    },
    notifications: {
      title: "Уведомления",
      subtitle: "Личные и школьные сообщения без лишнего шума.",
      read: "Прочитано",
      unread: "Новое"
    },
    kiosk: {
      mode: "Kiosk mode",
      autoRefresh: "Автообновление: 30 сек",
      title: "Школьный экран",
      topStudents: "Лидеры дня",
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
      subtitle: "Сообщения по ролям, классам, параллелям и всей школе.",
      scopeSchool: "Вся школа",
      scopeClass: "Класс",
      scopeRole: "Роль",
      scopeParallel: "Параллель",
      noClass: "Без класса"
    }
  },
  kz: {
    appName: "Aqbobek Lyceum",
    appSubtitle: "Мектептің цифрлық порталы",
    secureSpace: "Оқу, кесте және коммуникацияға арналған бірыңғай орта",
    language: "Тіл",
    localeName: { ru: "Русский", kz: "Қазақша" },
    nav: {
      dashboard: "Басты бет",
      portfolio: "Портфолио",
      schedule: "Сабақ кестесі",
      notifications: "Хабарламалар",
      kiosk: "Kiosk"
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
      schoolSpace: "Бағалар, тәуекелдер, кесте, хабарламалар және негізгі мектеп процестері бір кабинетте."
    },
    login: {
      badge: "Aqbobek Lyceum",
      title: "Лицейге арналған біртұтас цифрлық орта.",
      subtitle:
        "Бағалар, attendance, AI-талдау, хабарламалар және smart schedule бір қорғалған өнімде біріктірілген.",
      features: [
        "Оқушы, мұғалім, ата-ана және әкімшіге арналған рөлдік қолжетімділік",
        "Келесі қадамдары түсінікті AI-аналитика",
        "BilimClass sync, хабарламалар және smart schedule"
      ],
      formBadge: "Кіру",
      signIn: "Кіру",
      username: "Логин",
      password: "Құпиясөз",
      submit: "Кіру",
      submitting: "Кіріп жатырмыз...",
      invalid: "Кіру сәтсіз. Логин мен құпиясөзді тексеріңіз.",
      testAccounts: "Демо-аккаунттар",
      loading: "Форма жүктелуде..."
    },
    student: {
      title: "Оқушы кабинеті",
      subtitle: "Үлгерім, AI-көмек, attendance, портфолио және ата-анамен байланыс бір жерде.",
      tutorAdvice: "AI-тьютор",
      weeklySummary: "Апталық қорытынды",
      gamification: "Прогресс пен мотивация",
      streak: "Серия",
      leaderboardRank: "Рейтингтегі орны",
      points: "Ұпай"
    },
    teacher: {
      title: "Мұғалім кабинеті",
      subtitle: "Оқушы тәуекелдері, сынып көрінісі, attendance және дайын AI-есеп артық мәтінсіз.",
      report: "Сынып бойынша AI-есеп",
      performanceView: "Оқушылар кескіні",
      student: "Оқушы",
      highestRisk: "Негізгі тәуекел",
      reason: "Себеп",
      misses: "Қатыспау"
    },
    parent: {
      title: "Ата-ана кабинеті",
      subtitle: "Бағалар, қатысу, weekly digest және бала бойынша түсінікті сигналдар.",
      weeklySummary: "Апталық қорытынды",
      missesSuffix: "сабақ босату"
    },
    admin: {
      title: "Әкімшілік панелі",
      subtitle: "Мектеп бойынша шолу, тәуекелдер, кесте, интеграциялар және операциялық бақылау.",
      classes: "Сыныптар",
      students: "Оқушылар",
      riskShare: "Тәуекел үлесі",
      misses: "Қатыспау",
      performanceByClass: "Сыныптар бойынша үлгерім",
      performanceBySubject: "Пәндер бойынша үлгерім",
      schoolFeed: "Мектеп лентасы"
    },
    portfolio: {
      title: "Портфолио",
      subtitle: "Расталған жетістіктер, сертификаттар және мектеп белсенділігі.",
      achievements: "Жетістіктер",
      certificates: "Сертификаттар",
      items: "Белсенділіктер"
    },
    schedule: {
      title: "Сабақ кестесі",
      subtitle: "Апталық кесте, ауыстырулар, қос сабақтар, ағындар, іс-шаралар және күндік өзгерістер.",
      replacement: "Ауыстыру",
      days: ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"]
    },
    notifications: {
      title: "Хабарламалар",
      subtitle: "Жеке және мектептік хабарламалар артық шуылсыз.",
      read: "Оқылған",
      unread: "Жаңа"
    },
    kiosk: {
      mode: "Kiosk mode",
      autoRefresh: "Автожаңарту: 30 сек",
      title: "Мектеп экраны",
      topStudents: "Күн көшбасшылары",
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
      probabilityFail: "Сәтсіздік тәуекелі",
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
      subtitle: "Рөлдерге, сыныптарға, параллельдерге және бүкіл мектепке хабарлама жіберу.",
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
  "Assembly: University Track": { ru: "Сбор: университетский трек", kz: "Жиын: университет бағыты" }
};

const contentTranslations: Record<string, Record<Locale, string>> = {
  "Regional Physics Olympiad": { ru: "Региональная олимпиада по физике", kz: "Физикадан өңірлік олимпиада" },
  "regional silver": { ru: "региональное серебро", kz: "өңірлік күміс" },
  "Robotics Club Demo Day": { ru: "Демо-день клуба робототехники", kz: "Робототехника клубының демо күні" },
  "AI Literacy Bootcamp": { ru: "Интенсив по AI literacy", kz: "AI literacy интенсиві" },
  "STEM Research Club": { ru: "STEM research club", kz: "STEM research club" },
  "Peer Math Mentoring": { ru: "Peer mentoring по математике", kz: "Математика бойынша peer mentoring" },
  club: { ru: "клуб", kz: "клуб" },
  volunteering: { ru: "волонтерство", kz: "еріктілік" },
  "Raise Physics final score to 85+": { ru: "Поднять итог по физике до 85+", kz: "Физика бойынша қорытындыны 85+ деңгейіне жеткізу" },
  "Zero unexcused absences next month": { ru: "Ноль пропусков без причины в следующем месяце", kz: "Келесі айда себепсіз босатуды нөлге түсіру" },
  "Science Sprint": { ru: "Science Sprint", kz: "Science Sprint" },
  "Portfolio Pro": { ru: "Portfolio Pro", kz: "Portfolio Pro" },
  "High momentum in STEM subjects": { ru: "Сильная динамика по STEM-предметам", kz: "STEM пәндері бойынша жоғары қарқын" },
  "Verified achievements and certificates": { ru: "Подтвержденные достижения и сертификаты", kz: "Расталған жетістіктер мен сертификаттар" },
  "AIS Hack 3.0 Demo Rehearsal": { ru: "Репетиция AIS Hack 3.0", kz: "AIS Hack 3.0 репетициясы" },
  "Final rehearsal in the assembly hall for all finalists.": {
    ru: "Финальная репетиция в актовом зале для всех финалистов.",
    kz: "Барлық финалистерге арналған соңғы репетиция акт залында өтеді."
  },
  "Physics consultation moved": { ru: "Консультация по физике перенесена", kz: "Физика консультациясы ауыстырылды" },
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
    ru: "Репетиция скоро начнется. Подготовьте презентации.",
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
      critical_decline: "резкое снижение"
    },
    kz: {
      improving: "жақсарып жатыр",
      stable: "тұрақты",
      declining: "төмендеп жатыр",
      critical_decline: "күрт төмендеу"
    }
  } as const;

  return map[locale][value];
}

export function translateRiskStatus(locale: Locale, value: "strong" | "stable" | "risk") {
  const map = {
    ru: {
      strong: "сильная зона",
      stable: "рабочая зона",
      risk: "зона риска"
    },
    kz: {
      strong: "күшті аймақ",
      stable: "тұрақты аймақ",
      risk: "тәуекел аймағы"
    }
  } as const;

  return map[locale][value];
}

export function translateRole(locale: Locale, role: Role) {
  return dictionary[locale].role[role];
}
