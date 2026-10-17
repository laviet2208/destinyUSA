import type { FlashSchedule } from '../types';

export function flashSaleIsOpen(schedule?: FlashSchedule, localNow = Date.now()) {
  if (!schedule) return false;
  const now = Date.parse(schedule.serverNow) + localNow - (schedule.receivedAt ?? localNow);
  const start = Date.parse(schedule.startsAt);
  const end = Date.parse(schedule.endsAt);
  return Number.isFinite(now) && Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
}

export function enterFlashSale(schedule: FlashSchedule | undefined, open: () => void, unavailable: () => void) {
  if (!flashSaleIsOpen(schedule)) { unavailable(); return false; }
  open(); return true;
}
