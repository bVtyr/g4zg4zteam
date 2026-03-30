import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MetricCard, PageSection } from "@/components/layout/page-section";
import { ScheduleAssignmentManager } from "@/components/schedule/schedule-assignment-manager";
import { ScheduleRoomManager } from "@/components/schedule/schedule-room-manager";
import { ScheduleSubjectManager } from "@/components/schedule/schedule-subject-manager";
import { ScheduleTeacherManager } from "@/components/schedule/schedule-teacher-manager";
import { getCurrentLocale } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/services/portal-data";
import { getScheduleResourceWorkspace } from "@/lib/services/schedule-resource-service";

export default async function AdminScheduleResourcesPage() {
  const locale = await getCurrentLocale();
  const session = await requirePageRole([Role.admin]);
  const workspace = await getScheduleResourceWorkspace();
  const copy =
    locale === "kz"
      ? {
          title: "Кесте ресурстары",
          subtitle:
            "Генерация алдында мугалiмдердi, кабинеттердi, пандердi және сыныптык teaching assignments байланыстарын бiр жерден реттеңiз.",
          overview: "Жуйе жагдайы",
          teachers: "Мугалiмдер",
          rooms: "Кабинеттер",
          subjects: "Пандер",
          assignments: "Teaching Assignments"
        }
      : {
          title: "Ресурсы расписания",
          subtitle:
            "Подготовь базу для генерации в одном месте: учителя, кабинеты, предметы и teaching assignments по классам.",
          overview: "Состояние базы",
          teachers: "Учителя",
          rooms: "Кабинеты",
          subjects: "Предметы",
          assignments: "Teaching Assignments"
        };

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/admin/schedule/resources"
      title={copy.title}
      subtitle={copy.subtitle}
    >
      <PageSection title={copy.overview} description={copy.subtitle}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label={copy.teachers} value={workspace.stats.teachers} />
          <MetricCard
            label={locale === "kz" ? "Белсендi мугалiмдер" : "Активные учителя"}
            value={workspace.stats.activeTeachers}
            tone="success"
          />
          <MetricCard label={copy.rooms} value={workspace.stats.rooms} />
          <MetricCard label={copy.subjects} value={workspace.stats.subjects} />
          <MetricCard label={copy.assignments} value={workspace.stats.assignments} tone="accent" />
        </div>
      </PageSection>

      <PageSection title={copy.teachers}>
        <ScheduleTeacherManager
          locale={locale}
          teachers={workspace.teachers}
          rooms={workspace.rooms.map((room) => ({
            id: room.id,
            name: room.name
          }))}
        />
      </PageSection>

      <PageSection title={copy.rooms}>
        <ScheduleRoomManager locale={locale} rooms={workspace.rooms} />
      </PageSection>

      <PageSection title={copy.subjects}>
        <ScheduleSubjectManager locale={locale} subjects={workspace.subjects} />
      </PageSection>

      <PageSection title={copy.assignments}>
        <ScheduleAssignmentManager
          locale={locale}
          assignments={workspace.assignments}
          classes={workspace.classes.map((schoolClass) => ({
            id: schoolClass.id,
            name: schoolClass.name
          }))}
          subjects={workspace.subjects.map((subject) => ({
            id: subject.id,
            name: subject.name
          }))}
          teachers={workspace.teachers.map((teacher) => ({
            id: teacher.id,
            name: teacher.fullName
          }))}
          rooms={workspace.rooms.map((room) => ({
            id: room.id,
            name: room.name
          }))}
        />
      </PageSection>
    </DashboardShell>
  );
}
