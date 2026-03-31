# Aqbobek Lyceum Portal

Краткий README для локального запуска проекта.

## Что это
Единый школьный портал для **ученика, учителя, родителя и администрации**.

### Основной функционал
- **Ученик:** оценки, аналитика успеваемости, AI-рекомендации, цели, достижения, портфолио.
- **Учитель:** список учеников в зоне риска, аналитика по классу, AI-отчёт.
- **Родитель:** просмотр успеваемости ребёнка и недельная AI-сводка.
- **Администрация:** события, уведомления, управление пользователями, журнал действий.
- **Расписание:** генерация, ручное редактирование, проверка конфликтов, перерасчёт замен.
- **Kiosk Mode:** режим «интерактивной стенгазеты» для экранов/панелей.
- **BilimClass:** работа через mock-режим, предусмотрена интеграция через адаптер.

## Технологии
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- JWT auth
- Zod

## Как запустить локально
### 1. Установить зависимости
```bash
npm install
```

### 2. Создать `.env`
Скопируйте пример:
```bash
cp .env.example .env
```

Минимально проверьте, что в `.env` есть:
```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="replace-with-strong-access-secret"
JWT_REFRESH_SECRET="replace-with-strong-refresh-secret"
BILIMCLASS_MODE="live"
BILIMCLASS_CREDENTIALS_SECRET="replace-with-strong-bilimclass-secret"
```

### 3. Поднять базу и Prisma client
```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Заполнить тестовыми данными
```bash
npm run prisma:seed
```

### 5. Запустить сервер
```bash
npm run dev
```

После запуска проект обычно доступен по адресу:
```text
http://localhost:3000
```

## Полезные команды
```bash
npm run dev        # локальная разработка
npm run build      # production build
npm run start      # запуск production-сборки
npm run lint       # проверка кода
```

## Демо-поток
После сидирования можно проверять:
- вход в систему;
- дашборды по ролям;
- AI-аналитику успеваемости;
- родительский режим;
- модуль расписания;
- kiosk mode.

## Важно

- Если меняете схему Prisma, снова выполните:
```bash
npm run prisma:generate
npm run prisma:push
```

## Структура проекта
```text
app/          страницы и API routes
components/   UI-компоненты
lib/          бизнес-логика, AI, auth, расписание, интеграции
prisma/       схема БД и seed
public/       статические файлы
```
