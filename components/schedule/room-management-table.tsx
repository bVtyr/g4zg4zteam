import { getRoomTypeLabel } from "@/lib/schedule/copy";

export function RoomManagementTable({
  locale,
  rooms
}: {
  locale: "ru" | "kz";
  rooms: Array<{
    id: string;
    name: string;
    capacity: number;
    type: any;
    allowEvents: boolean;
    isActive: boolean;
    suitableFor: string | null;
  }>;
}) {
  const copy =
    locale === "kz"
      ? {
          room: "Кабинет",
          type: "Түрі",
          capacity: "Сыйымдылығы",
          suitableFor: "Пәндер",
          status: "Мәртебе",
          active: "Белсенді",
          inactive: "Белсенді емес"
        }
      : {
          room: "Кабинет",
          type: "Тип",
          capacity: "Вместимость",
          suitableFor: "Подходит для",
          status: "Статус",
          active: "Активен",
          inactive: "Неактивен"
        };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <th className="px-3 py-3">{copy.room}</th>
            <th className="px-3 py-3">{copy.type}</th>
            <th className="px-3 py-3">{copy.capacity}</th>
            <th className="px-3 py-3">{copy.suitableFor}</th>
            <th className="px-3 py-3">{copy.status}</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-3 py-3 font-medium text-ink">{room.name}</td>
              <td className="px-3 py-3 text-slate-600">{getRoomTypeLabel(locale, room.type)}</td>
              <td className="px-3 py-3 text-slate-600">{room.capacity}</td>
              <td className="px-3 py-3 text-slate-600">{room.suitableFor ?? "—"}</td>
              <td className="px-3 py-3 text-slate-600">{room.isActive ? copy.active : copy.inactive}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
