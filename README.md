# Aqbobek Lyceum Portal

Demo-ready MVP school platform for AIS Hack 3.0 built with `Next.js + TypeScript + Tailwind + Prisma + SQLite + JWT auth`.

## Step 1. Architecture and stack

- Frontend: Next.js App Router, React 19, Tailwind, Recharts
- Backend: Next.js route handlers with service layer and RBAC
- Auth: custom username/password, JWT access token + refresh token in httpOnly cookies
- Data: Prisma + SQLite
- Integrations: BilimClass adapter with `live` and `mock` modes
- AI: explainable engines first, optional LLM fallback hook via `OPENAI_API_KEY`
- Scheduling: greedy generator + conflict validation + teacher absence recalculation

## Step 2. Project structure

```text
app/
  api/
  dashboard/
  kiosk/
  login/
  notifications/
  portfolio/
  schedule/
components/
  cards/
  charts/
  forms/
  kiosk/
  layout/
  schedule/
  tables/
lib/
  ai/
  auth/
  bilimclass/
  db/
  rbac/
  schedule/
  services/
prisma/
  schema.prisma
  seed.ts
blimclass/
  resp.json
  bilimclass api report.txt
```

## Step 3. Prisma schema

Implemented entities:

- `User`
- `StudentProfile`
- `TeacherProfile`
- `ParentProfile`
- `AdminProfile`
- `SchoolClass`
- `Subject`
- `TeachingAssignment`
- `GradeRecord`
- `AttendanceRecord`
- `Achievement`
- `Certificate`
- `PortfolioItem`
- `Goal`
- `Badge`
- `BadgeAward`
- `LeaderboardScore`
- `RiskAssessment`
- `Event`
- `Notification`
- `NotificationReceipt`
- `ScheduleEntry`
- `Room`
- `TeacherAvailability`
- `ScheduleChangeLog`
- `ParentStudentLink`
- `ParentLinkCode`
- `BilimClassConnection`
- `BilimClassSyncLog`
- `AuditLog`
- `RefreshToken`

Schema file: [prisma/schema.prisma](/f:/mine/hackathon/aishack2/prisma/schema.prisma)

## Step 4. Seed script

Seed file: [prisma/seed.ts](/f:/mine/hackathon/aishack2/prisma/seed.ts)

Creates:

- demo accounts for `student`, `teacher`, `parent`, `admin`
- class `11 B` with classmates and linked parent
- subjects, rooms, teaching assignments, teacher availability
- grades and attendance records
- portfolio, certificates, achievements, badges, goals, leaderboard
- risk assessments
- events, notifications, schedule, BilimClass mock connection and sync log

## Step 5. BilimClass adapter + normalizer + integration service

Files:

- [lib/bilimclass/adapter.ts](/f:/mine/hackathon/aishack2/lib/bilimclass/adapter.ts)
- [lib/bilimclass/crypto.ts](/f:/mine/hackathon/aishack2/lib/bilimclass/crypto.ts)
- [lib/bilimclass/normalizers.ts](/f:/mine/hackathon/aishack2/lib/bilimclass/normalizers.ts)
- [lib/bilimclass/service.ts](/f:/mine/hackathon/aishack2/lib/bilimclass/service.ts)
- [blimclass/resp.json](/f:/mine/hackathon/aishack2/blimclass/resp.json)

Supported production-like flow:

- `POST /api/v2/os/login`
- `GET /api/v4/os/clientoffice/diary/periods`
- `GET /api/v4/os/clientoffice/diary/year`
- `GET /api/v4/os/clientoffice/diary/subjects`

Implemented integration behavior:

- each student can connect their own BilimClass account from the student dashboard
- BilimClass credentials and tokens are encrypted at rest
- sync uses the student's own login/password on the server side
- grades and attendance are normalized into local `GradeRecord` and `AttendanceRecord`
- subject names are sanitized from production-like payloads and upserted into the local catalog
- stale data is refreshed automatically on dashboard open
- manual refresh is available from the UI and via API

Normalizer functions:

- `normalizeBilimClassYearData()`
- `normalizeBilimClassSubjectData()`
- `normalizeBilimClassAttendance()`
- `mapBilimClassScoreType()`

Handled BilimClass fields:

- `groupName`
- `groupId`
- `rows[].subjectName`
- `rows[].scoreType`
- `rows[].periodType`
- `rows[].attendances`
- `rows[].attestations`
- `rows[].yearScores`
- attendance: `missingByAnotherReason`, `missingBySick`, `missingDue`, `missingWithoutReason`, `totalMissCount`
- attestations: `quarter1..quarter4`
- year scores: `yearScore`, `examScore`, `finalScore`

Scoring rules:

- `mark`: numeric normalization and risk analysis
- `credit`: pass/fail style scoring
- `no_score`: excluded from grade risk, still used for attendance/engagement insights

## Step 6. Backend API routes

Auth:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

BilimClass:

- `POST /api/integrations/bilimclass/login`
- `GET /api/integrations/bilimclass/status`
- `POST /api/integrations/bilimclass/sync/year`
- `POST /api/integrations/bilimclass/sync/subjects`

Student:

- `GET /api/student/dashboard`
- `GET /api/student/analytics`
- `GET /api/student/portfolio`
- `GET /api/student/goals`
- `GET /api/student/bilimclass/status`
- `POST /api/student/bilimclass/connect`
- `POST /api/student/bilimclass/sync`
- `POST /api/student/parent-link-code`
- `DELETE /api/student/parent-links/[linkId]`

Teacher:

- `GET /api/teacher/dashboard`
- `GET /api/teacher/risks`
- `GET /api/teacher/report`

Parent:

- `POST /api/parent/children/link`
- `DELETE /api/parent/children/[linkId]`
- `GET /api/parent/dashboard`
- `GET /api/parent/weekly-summary`

Admin:

- `GET /api/admin/audit-logs`
- `GET /api/admin/export?target=logs|users|grades`
- `PATCH /api/admin/users/[userId]`
- `POST /api/admin/users/bulk`
- `PATCH /api/admin/grades/[gradeId]`
- `POST /api/admin/parent-links`
- `DELETE /api/admin/parent-links/[linkId]`
- `POST /api/admin/bilimclass/sync/[studentId]`
- `GET /api/admin/dashboard`
- `GET|POST /api/admin/events`
- `GET|POST /api/admin/notifications`
- `POST /api/admin/schedule/generate`
- `POST /api/admin/schedule/recalculate`
- `POST /api/admin/schedule/manual-entry`

Kiosk:

- `GET /api/kiosk/feed`

## Step 7. AI engines

File: [lib/ai/engines.ts](/f:/mine/hackathon/aishack2/lib/ai/engines.ts)

Implemented:

- `calculateSubjectRisk()`
- `detectTrend()`
- `generateRecommendations()`
- `explainRisk()`
- `buildWeeklySummary()`
- `buildTeacherReport()`
- `parseBreakdown()`

Risk logic:

- base risk from normalized score
- penalties for decline trend
- penalties for total misses
- extra penalties for unexcused absence
- stability boost for low volatility
- final clamp to `0..100`

## Step 8. Schedule engine

File: [lib/schedule/engine.ts](/f:/mine/hackathon/aishack2/lib/schedule/engine.ts)

Implemented:

- `validateScheduleConflicts()`
- `generateInitialSchedule()`
- `regenerateForTeacherAbsence()`
- `notifyAffectedUsers()`

Supports:

- lesson
- pair
- academic hour
- event
- stream

Constraints checked:

- no teacher overlap
- no room overlap
- no class overlap
- teacher availability
- replacement notifications after recalculation

## Step 9. Frontend pages and reusable components

Pages:

- `/login`
- `/dashboard/student`
- `/dashboard/teacher`
- `/dashboard/parent`
- `/dashboard/admin`
- `/admin/schedule`
- `/admin/schedule/grid`
- `/admin/schedule/generator`
- `/admin/schedule/manual`
- `/admin/schedule/conflicts`
- `/admin/schedule/replacements`
- `/admin/schedule/teachers`
- `/admin/schedule/rooms`
- `/admin/schedule/time-slots`
- `/admin/schedule/templates`
- `/admin/schedule/change-log`
- `/portfolio`
- `/schedule`
- `/notifications`
- `/kiosk`

Reusable components:

- `GradeCard`
- `BilimClassConnectionCard`
- `StudentParentLinkCard`
- `SubjectTrendChart`
- `RiskBadge`
- `AttendanceSummary`
- `WeeklyInsightCard`
- `TeacherRiskTable`
- `AdminRadarPanel`
- `AdminControlCenter`
- `ScheduleBoard`
- `ScheduleSidebarSection`
- `ScheduleOverviewCards`
- `ScheduleGrid`
- `ScheduleFilters`
- `ScheduleEntryCard`
- `ScheduleEntryEditor`
- `ScheduleGeneratorPanel`
- `ConflictTable`
- `ReplacementPanel`
- `TeacherManagementTable`
- `TeacherForm`
- `RoomManagementTable`
- `RoomForm`
- `TimeSlotEditor`
- `ChangeLogTable`
- `StudentGradebook`
- `ParentChildLinkCard`
- `KioskFeed`
- `NotificationComposer`
- `PortfolioList`

## Step 10. Run locally

### 1. Install

```bash
npm install
```

### 2. Environment

`.env` is already prepared for local demo.

Main vars:

- `DATABASE_URL="file:./dev.db"`
  Runtime resolves this to `prisma/dev.db`, so CLI and app use the same SQLite file.
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `BILIMCLASS_MODE="mock"`
- `BILIMCLASS_CREDENTIALS_SECRET`
- `BILIMCLASS_AUTO_SYNC_MINUTES="360"`
- `PARENT_LINK_CODE_TTL_SECONDS="240"`
- `OPENAI_API_KEY=""`

### 3. Generate DB and seed

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

### 4. Start

```bash
npm run dev
```

### 5. Demo accounts

- `student / demo12345`
- `teacher / demo12345`
- `parent / demo12345`
- `parent2 / demo12345`
- `admin / demo12345`

## Step 11. MVP delivered and next improvements

Delivered in this MVP:

- custom JWT auth with refresh token storage
- RBAC and protected pages/routes
- one-time parent linking flow with 4-minute code TTL, anti-reuse protection and unlink actions
- student, teacher, parent, admin dashboards
- extended admin control center with audit logs, inline edits, bulk actions, CSV export, grade moderation and manual BilimClass sync
- BilimClass live/mock adapter with per-student connection flow, encrypted credential storage and dashboard sync UI
- explainable AI analytics with fallback summaries
- schedule generation, conflict validation and absence recalculation
- notification center
- events feed
- kiosk mode
- seed/demo data for full demo flow

Reasonable post-hackathon improvements:

- add refresh-token rotation endpoint
- add full CRUD UI for schedule entries and events
- persist AI assessments after every sync
- support XLSX export parsing from BilimClass endpoints
- richer constraint solver for schedule rebuilding
- add audit log UI and notification read-state mutations
- plug actual LLM rewrite path behind feature flag and model config

## Verification

Verified locally in this workspace:

- `npx tsc --noEmit`
- `npm run prisma:generate`
- `npm run prisma:push`
- `npm run prisma:seed`
- `npm run build`
