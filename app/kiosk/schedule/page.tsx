import { ScheduleKioskScreen } from "@/components/schedule/schedule-kiosk-screen";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getScheduleDisplayData } from "@/lib/services/schedule-display-service";

export default async function KioskSchedulePage({
  searchParams
}: {
  searchParams: Promise<{
    schoolYear?: string;
    term?: string;
    classId?: string;
    teacherId?: string;
    roomId?: string;
    dayOfWeek?: string;
  }>;
}) {
  const locale = await getCurrentLocale();
  const params = await searchParams;
  const initialData = await getScheduleDisplayData({
    schoolYear: params.schoolYear,
    term: params.term,
    classId: params.classId ?? null,
    teacherId: params.teacherId ?? null,
    roomId: params.roomId ?? null,
    dayOfWeek: params.dayOfWeek ? Number(params.dayOfWeek) : null
  });

  return <ScheduleKioskScreen locale={locale} initialData={initialData} />;
}
