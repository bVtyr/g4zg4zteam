export function TeacherManagementTable({
  locale,
  teachers
}: {
  locale: "ru" | "kz";
  teachers: Array<{
    id: string;
    user: { fullName: string };
    title: string | null;
    expertise: string | null;
    isActive: boolean;
    canSubstitute: boolean;
    substituteWeight: number;
    assignments: Array<{ subject: { name: string }; schoolClass: { name: string } }>;
  }>;
}) {
  const copy =
    locale === "kz"
      ? {
          teacher: "Мұғалім",
          role: "Лауазымы",
          assignments: "Жүктеме",
          substitute: "Ауыстыру",
          status: "Мәртебе",
          yes: "Иә",
          no: "Жоқ",
          active: "Белсенді",
          inactive: "Белсенді емес"
        }
      : {
          teacher: "Учитель",
          role: "Роль",
          assignments: "Назначения",
          substitute: "Замены",
          status: "Статус",
          yes: "Да",
          no: "Нет",
          active: "Активен",
          inactive: "Неактивен"
        };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <th className="px-3 py-3">{copy.teacher}</th>
            <th className="px-3 py-3">{copy.role}</th>
            <th className="px-3 py-3">{copy.assignments}</th>
            <th className="px-3 py-3">{copy.substitute}</th>
            <th className="px-3 py-3">{copy.status}</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => (
            <tr key={teacher.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-3 py-3 font-medium text-ink">{teacher.user.fullName}</td>
              <td className="px-3 py-3 text-slate-600">{teacher.title ?? "—"}</td>
              <td className="px-3 py-3 text-slate-600">
                {teacher.assignments.slice(0, 3).map((assignment) => `${assignment.schoolClass.name} • ${assignment.subject.name}`).join(", ") || "—"}
              </td>
              <td className="px-3 py-3 text-slate-600">{teacher.canSubstitute ? `${copy.yes} (${teacher.substituteWeight})` : copy.no}</td>
              <td className="px-3 py-3 text-slate-600">{teacher.isActive ? copy.active : copy.inactive}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
