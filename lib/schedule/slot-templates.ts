export const WEEK_DAYS = [1, 2, 3, 4, 5] as const;

export const SLOT_TEMPLATES = [
  { slotIndex: 1, startTime: "08:00", endTime: "08:45" },
  { slotIndex: 2, startTime: "08:55", endTime: "09:40" },
  { slotIndex: 3, startTime: "09:50", endTime: "10:35" },
  { slotIndex: 4, startTime: "10:45", endTime: "11:30" },
  { slotIndex: 5, startTime: "11:40", endTime: "12:25" },
  { slotIndex: 6, startTime: "12:30", endTime: "13:05" },
  { slotIndex: 7, startTime: "13:50", endTime: "14:35" },
  { slotIndex: 8, startTime: "14:45", endTime: "15:30" },
  { slotIndex: 9, startTime: "15:40", endTime: "16:25" },
  { slotIndex: 10, startTime: "16:35", endTime: "17:20" }
] as const;

export function getSlotTemplate(slotIndex: number) {
  return SLOT_TEMPLATES.find((slot) => slot.slotIndex === slotIndex) ?? null;
}
