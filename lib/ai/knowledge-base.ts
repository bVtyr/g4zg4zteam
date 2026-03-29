import { type Locale } from "@/lib/i18n";

export type LocalizedText = Record<Locale, string>;

export type TopicResource = {
  title: LocalizedText;
  provider: string;
  url: string;
  duration: LocalizedText;
};

export type KnowledgeTopic = {
  key: string;
  title: LocalizedText;
  reasons: {
    low: LocalizedText;
    trend: LocalizedText;
    attendance: LocalizedText;
    volatility: LocalizedText;
  };
  resource: TopicResource;
};

export type SubjectKnowledgeProfile = {
  assessmentLabel: LocalizedText;
  topics: KnowledgeTopic[];
};

const YT = "YouTube";

export const SUBJECT_KNOWLEDGE_BASE: Record<string, SubjectKnowledgeProfile> = {
  Physics: {
    assessmentLabel: { ru: "следующий СОЧ по физике", kz: "физикадан келесі БЖБ/ТЖБ" },
    topics: [
      {
        key: "mechanics",
        title: { ru: "Механика и анализ задач", kz: "Механика және есеп талдауы" },
        reasons: {
          low: { ru: "проседают базовые вычислительные задачи", kz: "базалық есептік тапсырмалар әлсіз" },
          trend: { ru: "последние темы ухудшили точность решений", kz: "соңғы тақырыптар шешім дәлдігін төмендеткен" },
          attendance: { ru: "пропуски мешают удерживать формулы", kz: "сабақ босату формулаларды бекітуге кедергі" },
          volatility: { ru: "результат нестабилен от темы к теме", kz: "нәтиже тақырыптан тақырыпқа тұрақсыз" }
        },
        resource: {
          title: { ru: "Ньютон и базовая динамика", kz: "Ньютон заңдары және базалық динамика" },
          provider: `${YT} / Khan Academy`,
          url: "https://www.youtube.com/results?search_query=khan+academy+newton+laws",
          duration: { ru: "12-18 мин", kz: "12-18 мин" }
        }
      },
      {
        key: "electricity",
        title: { ru: "Электричество и цепи", kz: "Электр тогы және тізбектер" },
        reasons: {
          low: { ru: "слабеет понимание ключевых законов", kz: "негізгі заңдарды түсіну әлсіреген" },
          trend: { ru: "спад начался на формулах и схемах", kz: "құлдырау формула мен сызбада басталған" },
          attendance: { ru: "пропуски нарушили целостность темы", kz: "жіберілген сабақтар тақырып тұтастығын бұзған" },
          volatility: { ru: "ошибки повторяются в разных форматах задач", kz: "қателер әртүрлі есеп форматында қайталанады" }
        },
        resource: {
          title: { ru: "Закон Ома и простые цепи", kz: "Ом заңы және қарапайым тізбектер" },
          provider: `${YT} / Khan Academy`,
          url: "https://www.youtube.com/results?search_query=ohm%27s+law+khan+academy",
          duration: { ru: "11-15 мин", kz: "11-15 мин" }
        }
      },
      {
        key: "lab",
        title: { ru: "Графики и лабораторные выводы", kz: "Графиктер және зертханалық қорытынды" },
        reasons: {
          low: { ru: "сложно читать таблицы и графики", kz: "кесте мен графикті оқу қиын" },
          trend: { ru: "ошибки сместились в практические работы", kz: "қателер практикалық жұмысқа ауысқан" },
          attendance: { ru: "пропуски сократили число разборов", kz: "сабақ босату талдаулар санын азайтқан" },
          volatility: { ru: "между теорией и практикой большой разрыв", kz: "теория мен практика арасында айырма үлкен" }
        },
        resource: {
          title: { ru: "Как читать графики по физике", kz: "Физикадағы графиктерді оқу" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=reading+physics+graphs+lesson",
          duration: { ru: "9-14 мин", kz: "9-14 мин" }
        }
      }
    ]
  },
  Algebra: {
    assessmentLabel: { ru: "следующий СОЧ по алгебре", kz: "алгебрадан келесі БЖБ/ТЖБ" },
    topics: [
      {
        key: "equations",
        title: { ru: "Уравнения и преобразования", kz: "Теңдеулер және түрлендірулер" },
        reasons: {
          low: { ru: "ошибки начинаются с базовых шагов", kz: "қате бастапқы қадамдардан басталады" },
          trend: { ru: "динамика падает на преобразованиях", kz: "түрлендірулерде динамика төмендеген" },
          attendance: { ru: "пропуски разорвали логику темы", kz: "жіберілген сабақтар тақырып логикасын үзген" },
          volatility: { ru: "результат скачет от задания к заданию", kz: "нәтиже тапсырмадан тапсырмаға құбылады" }
        },
        resource: {
          title: { ru: "Квадратные уравнения без ошибок", kz: "Квадрат теңдеулерді қатесіз шешу" },
          provider: `${YT} / Khan Academy`,
          url: "https://www.youtube.com/results?search_query=khan+academy+quadratic+equations",
          duration: { ru: "12-18 мин", kz: "12-18 мин" }
        }
      },
      {
        key: "functions",
        title: { ru: "Функции и графики", kz: "Функциялар және графиктер" },
        reasons: {
          low: { ru: "сложно связывать график и формулу", kz: "график пен формуланы байланыстыру қиын" },
          trend: { ru: "спад усилился на графических заданиях", kz: "құлдырау графиктік тапсырмаларда күшейген" },
          attendance: { ru: "пропуски снизили уверенность в визуальных задачах", kz: "жіберілген сабақтар визуалды есепке сенімділікті азайтқан" },
          volatility: { ru: "качество резко меняется между вычислением и графиком", kz: "есептеу мен график арасында сапа қатты өзгереді" }
        },
        resource: {
          title: { ru: "Как читать график функции", kz: "Функция графигін оқу" },
          provider: `${YT} / Khan Academy`,
          url: "https://www.youtube.com/results?search_query=khan+academy+function+graphs",
          duration: { ru: "9-13 мин", kz: "9-13 мин" }
        }
      },
      {
        key: "word",
        title: { ru: "Текстовые задачи", kz: "Мәтіндік есептер" },
        reasons: {
          low: { ru: "сложно переводить условие в формулу", kz: "шартты формулаға айналдыру қиын" },
          trend: { ru: "ухудшение связано с прикладными задачами", kz: "төмендеу қолданбалы есептермен байланысты" },
          attendance: { ru: "пропуски уменьшили число типовых разборов", kz: "жіберілген сабақтар үлгі талдауларын азайтқан" },
          volatility: { ru: "теория выше, чем практика", kz: "теория практикадан жоғары" }
        },
        resource: {
          title: { ru: "Как переводить условие в уравнение", kz: "Шартты теңдеуге айналдыру" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=word+problems+equations+lesson",
          duration: { ru: "11-15 мин", kz: "11-15 мин" }
        }
      }
    ]
  },
  Informatics: {
    assessmentLabel: { ru: "следующий СОЧ по информатике", kz: "информатикадан келесі БЖБ/ТЖБ" },
    topics: [
      {
        key: "algorithms",
        title: { ru: "Алгоритмическое мышление", kz: "Алгоритмдік ойлау" },
        reasons: {
          low: { ru: "сложно разбить задачу на шаги", kz: "есепті қадамдарға бөлу қиын" },
          trend: { ru: "спад на логике и ветвлениях", kz: "құлдырау логика мен тармақталуда" },
          attendance: { ru: "пропуски мешают последовательному освоению", kz: "жіберілген сабақтар жүйелі меңгеруге кедергі" },
          volatility: { ru: "простые задачи решаются, сложные ломаются", kz: "жеңіл есептер шығады, күрделі есептер бұзылады" }
        },
        resource: {
          title: { ru: "Основы алгоритмов", kz: "Алгоритм негіздері" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=algorithm+basics+lesson",
          duration: { ru: "10-14 мин", kz: "10-14 мин" }
        }
      },
      {
        key: "debugging",
        title: { ru: "Кодирование и отладка", kz: "Код жазу және түзету" },
        reasons: {
          low: { ru: "ошибки в синтаксисе и проверке результата", kz: "қате синтаксис пен тексеруде" },
          trend: { ru: "снижение на практических задачах", kz: "төмендеу практикалық тапсырмаларда" },
          attendance: { ru: "пропуски сократили практику и code review", kz: "жіберілген сабақтар практика мен code review-ды азайтқан" },
          volatility: { ru: "идея понятна, но код нестабилен", kz: "идея түсінікті, бірақ код тұрақсыз" }
        },
        resource: {
          title: { ru: "Как отлаживать программу", kz: "Бағдарламаны қалай түзету керек" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=debugging+for+beginners",
          duration: { ru: "9-13 мин", kz: "9-13 мин" }
        }
      },
      {
        key: "data",
        title: { ru: "Данные и структуры", kz: "Деректер және құрылымдар" },
        reasons: {
          low: { ru: "проседает работа с данными", kz: "деректермен жұмыс әлсіреген" },
          trend: { ru: "темы с таблицами усилили риск", kz: "кестелік тақырыптар тәуекелді күшейткен" },
          attendance: { ru: "пропуски ухудшили практику на реальных примерах", kz: "жіберілген сабақтар нақты мысалдағы практиканы әлсіреткен" },
          volatility: { ru: "теория выше, чем прикладные задания", kz: "теория қолданбалы тапсырмадан жоғары" }
        },
        resource: {
          title: { ru: "Структуры данных для начинающих", kz: "Бастаушыларға арналған деректер құрылымы" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=data+structures+for+beginners",
          duration: { ru: "10-16 мин", kz: "10-16 мин" }
        }
      }
    ]
  },
  English: {
    assessmentLabel: { ru: "следующую аттестацию по английскому", kz: "ағылшын тілі бойынша келесі аттестация" },
    topics: [
      {
        key: "grammar",
        title: { ru: "Грамматика", kz: "Грамматика" },
        reasons: {
          low: { ru: "ошибки на базовых конструкциях", kz: "қате базалық құрылымдарда" },
          trend: { ru: "последние задания усилили слабость", kz: "соңғы тапсырмалар әлсіздікті күшейткен" },
          attendance: { ru: "пропуски снизили регулярность практики", kz: "жіберілген сабақтар практиканы сиреткен" },
          volatility: { ru: "правила не всегда переносятся в задания", kz: "ережелер тапсырмаға тұрақты көшпейді" }
        },
        resource: {
          title: { ru: "Базовая английская грамматика", kz: "Ағылшын тілінің базалық грамматикасы" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=english+grammar+basics+lesson",
          duration: { ru: "10-15 мин", kz: "10-15 мин" }
        }
      },
      {
        key: "reading",
        title: { ru: "Reading comprehension", kz: "Мәтінді түсіну" },
        reasons: {
          low: { ru: "сложно удерживать смысл текста", kz: "мәтін мағынасын ұстап тұру қиын" },
          trend: { ru: "снижение проявилось на reading tasks", kz: "төмендеу reading тапсырмаларында көрінді" },
          attendance: { ru: "пропуски уменьшили guided reading", kz: "жіберілген сабақтар guided reading-ті азайтқан" },
          volatility: { ru: "результат зависит от формата текста", kz: "нәтиже мәтін форматына тәуелді" }
        },
        resource: {
          title: { ru: "Reading strategies for exams", kz: "Емтиханға арналған reading стратегиялары" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=reading+strategies+for+students",
          duration: { ru: "9-14 мин", kz: "9-14 мин" }
        }
      },
      {
        key: "writing",
        title: { ru: "Writing structure", kz: "Жазылым құрылымы" },
        reasons: {
          low: { ru: "сложно быстро собрать письменный ответ", kz: "жазбаша жауапты тез құрастыру қиын" },
          trend: { ru: "падение на продуктивных заданиях", kz: "құлдырау өнімді тапсырмаларда" },
          attendance: { ru: "пропуски сократили письменную практику", kz: "жіберілген сабақтар жазылымды азайтқан" },
          volatility: { ru: "идея есть, оформление нестабильно", kz: "идея бар, бірақ рәсімдеу тұрақсыз" }
        },
        resource: {
          title: { ru: "Writing template for school tasks", kz: "Мектеп тапсырмасына арналған writing template" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=english+writing+template+lesson",
          duration: { ru: "10-14 мин", kz: "10-14 мин" }
        }
      }
    ]
  },
  default: {
    assessmentLabel: { ru: "следующую аттестацию", kz: "келесі аттестация" },
    topics: [
      {
        key: "core",
        title: { ru: "Базовые темы периода", kz: "Кезеңнің базалық тақырыптары" },
        reasons: {
          low: { ru: "базовый результат ниже цели", kz: "базалық нәтиже мақсаттан төмен" },
          trend: { ru: "последние периоды ухудшили динамику", kz: "соңғы кезеңдер динамиканы нашарлатқан" },
          attendance: { ru: "пропуски влияют на подготовку", kz: "сабақ босату дайындыққа әсер етеді" },
          volatility: { ru: "результат нестабилен", kz: "нәтиже тұрақсыз" }
        },
        resource: {
          title: { ru: "Повторение ключевых тем", kz: "Негізгі тақырыптарды қайталау" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=study+revision+lesson",
          duration: { ru: "10-15 мин", kz: "10-15 мин" }
        }
      },
      {
        key: "practice",
        title: { ru: "Практическое закрепление", kz: "Практикалық бекіту" },
        reasons: {
          low: { ru: "нужно больше типовой практики", kz: "типтік практика керек" },
          trend: { ru: "без коротких повторов темп падает", kz: "қысқа қайталаусыз қарқын төмендейді" },
          attendance: { ru: "пропуски сократили закрепление", kz: "жіберілген сабақтар бекітуді азайтқан" },
          volatility: { ru: "качество выполнения нестабильно", kz: "орындау сапасы тұрақсыз" }
        },
        resource: {
          title: { ru: "Как повторять эффективно", kz: "Тиімді қайталау әдісі" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=how+to+study+effectively+lesson",
          duration: { ru: "9-12 мин", kz: "9-12 мин" }
        }
      },
      {
        key: "engagement",
        title: { ru: "Ритм подготовки", kz: "Дайындық ырғағы" },
        reasons: {
          low: { ru: "нужно восстановить рабочий темп", kz: "жұмыс қарқынын қалпына келтіру керек" },
          trend: { ru: "темп снижается от периода к периоду", kz: "қарқын кезеңнен кезеңге төмендеп тұр" },
          attendance: { ru: "пропуски напрямую бьют по результату", kz: "сабақ босату нәтижеге тікелей әсер етеді" },
          volatility: { ru: "вовлеченность непостоянна", kz: "қатысу тұрақсыз" }
        },
        resource: {
          title: { ru: "Учебный тайм-менеджмент", kz: "Оқу тайм-менеджменті" },
          provider: YT,
          url: "https://www.youtube.com/results?search_query=study+time+management+lesson",
          duration: { ru: "8-12 мин", kz: "8-12 мин" }
        }
      }
    ]
  }
};

export function localized(locale: Locale, value: LocalizedText) {
  return value[locale];
}

export function getSubjectKnowledgeProfile(subjectName: string) {
  return SUBJECT_KNOWLEDGE_BASE[subjectName] ?? SUBJECT_KNOWLEDGE_BASE.default;
}
