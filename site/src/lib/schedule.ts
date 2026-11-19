// The live line's schedule engine. Pure: every function works from the instant
// it is given and never reads the clock. All wall-clock times are New York.

import marketClosures from '../data/market-closures.json' with { type: 'json' };

const ZONE = 'America/New_York';
const DAY = 86_400_000;

export interface MarketClosures {
  closed: string[];
  early_close: string[];
}

export class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export interface NextEvent {
  key: string;
  event: string;
  at: Date;
  when: string;
}

const nyFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function indexOf(date: CivilDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / DAY;
}

function fromIndex(index: number): CivilDate {
  const date = new Date(index * DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function addDays(date: CivilDate, days: number): CivilDate {
  return fromIndex(indexOf(date) + days);
}

function weekdayOf(date: CivilDate): number {
  return new Date(indexOf(date) * DAY).getUTCDay();
}

function isoKey(date: CivilDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

function nyParts(instant: Date): CivilDate & { hour: number; minute: number } {
  const parts: Record<string, number> = {};
  for (const part of nyFormat.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
  };
}

function nyOffsetMs(instant: Date): number {
  const parts = nyParts(instant);
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return wall - instant.getTime();
}

function instantAt(date: CivilDate, hour: number, minute: number): Date {
  const wall = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  let epoch = wall - nyOffsetMs(new Date(wall));
  epoch = wall - nyOffsetMs(new Date(epoch));
  const back = nyParts(new Date(epoch));
  if (
    back.year !== date.year ||
    back.month !== date.month ||
    back.day !== date.day ||
    back.hour !== hour ||
    back.minute !== minute
  ) {
    throw new ScheduleError(
      `wall time did not round-trip for ${isoKey(date)} ${pad(hour)}:${pad(minute)}`,
    );
  }
  return new Date(epoch);
}

function nthWeekday(year: number, month: number, weekday: number, n: number): CivilDate {
  const first = weekdayOf({ year, month, day: 1 });
  const day = 1 + ((weekday - first + 7) % 7) + 7 * (n - 1);
  return { year, month, day };
}

function lastWeekday(year: number, month: number, weekday: number): CivilDate {
  const end = new Date(Date.UTC(year, month, 0));
  const endDay = end.getUTCDate();
  const endWeekday = end.getUTCDay();
  return { year, month, day: endDay - ((endWeekday - weekday + 7) % 7) };
}

// Anonymous Gregorian computus.
function easterSunday(year: number): CivilDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

function goodFriday(year: number): CivilDate {
  return addDays(easterSunday(year), -2);
}

// A fixed-date holiday on a Saturday is observed the Friday before, on a
// Sunday the Monday after.
function observed(date: CivilDate): CivilDate {
  const day = weekdayOf(date);
  if (day === 6) return addDays(date, -1);
  if (day === 0) return addDays(date, 1);
  return date;
}

// New Year's Day on a Saturday is not observed at all.
function newYearsDay(year: number): CivilDate | null {
  const januaryFirst = { year, month: 1, day: 1 };
  if (weekdayOf(januaryFirst) === 6) return null;
  return observed(januaryFirst);
}

function closuresFor(year: number): Set<string> {
  const out = new Set<string>();
  const add = (date: CivilDate | null): void => {
    if (date) out.add(isoKey(date));
  };
  add(newYearsDay(year));
  add(nthWeekday(year, 1, 1, 3)); // Martin Luther King Jr. Day
  add(nthWeekday(year, 2, 1, 3)); // Washington's Birthday
  add(goodFriday(year));
  add(lastWeekday(year, 5, 1)); // Memorial Day
  add(observed({ year, month: 6, day: 19 })); // Juneteenth
  add(observed({ year, month: 7, day: 4 })); // Independence Day
  add(nthWeekday(year, 9, 1, 1)); // Labor Day
  add(nthWeekday(year, 11, 4, 4)); // Thanksgiving
  add(observed({ year, month: 12, day: 25 })); // Christmas
  return out;
}

function isTradingCivil(date: CivilDate, closures: MarketClosures): boolean {
  const weekday = weekdayOf(date);
  if (weekday === 0 || weekday === 6) return false;
  if (closures.closed.includes(isoKey(date))) return false;
  return !closuresFor(date.year).has(isoKey(date));
}

function isEarlyCloseCivil(date: CivilDate, closures: MarketClosures): boolean {
  if (!isTradingCivil(date, closures)) return false;
  if (closures.early_close.includes(isoKey(date))) return true;
  const thanksgiving = nthWeekday(date.year, 11, 4, 4);
  if (isoKey(date) === isoKey(addDays(thanksgiving, 1))) return true;
  if (date.month === 12 && date.day === 24) return true;
  if (date.month === 7 && date.day === 3) return true;
  if (date.month === 7 && date.day === 2) {
    const julyThird = { year: date.year, month: 7, day: 3 };
    return closuresFor(date.year).has(isoKey(julyThird));
  }
  return false;
}

export function isTradingDay(now: Date, closures: MarketClosures = marketClosures): boolean {
  return isTradingCivil(nyParts(now), closures);
}

export function isEarlyCloseCandidate(
  now: Date,
  closures: MarketClosures = marketClosures,
): boolean {
  return isEarlyCloseCivil(nyParts(now), closures);
}

interface EventSpec {
  hour: number;
  minute: number;
  event: string;
}

function eventsOn(date: CivilDate, closures: MarketClosures): EventSpec[] {
  const events: EventSpec[] = [];
  if (isTradingCivil(date, closures)) {
    events.push({ hour: 10, minute: 32, event: 'the trading bot checks the market' });
    if (!isEarlyCloseCivil(date, closures)) {
      events.push({ hour: 15, minute: 45, event: 'the trading bot closes its day' });
    }
  }
  if (weekdayOf(date) === 6) {
    events.push({ hour: 9, minute: 5, event: "the trading bot's weekly review" });
  }
  if (weekdayOf(date) === 0) {
    events.push({ hour: 3, minute: 0, event: 'every screen of the money app is tested end to end' });
  }
  events.push({ hour: 18, minute: 40, event: "the day's lessons are written down" });
  return events;
}

function timeLabel(hour: number, minute: number): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'a.m.' : 'p.m.';
  return `${hour12}:${pad(minute)} ${suffix}`;
}

function whenLabel(now: CivilDate, at: CivilDate, hour: number, minute: number): string {
  const day = indexOf(at) - indexOf(now) === 0 ? 'today' : 'tomorrow';
  return `${day}, ${timeLabel(hour, minute)}`;
}

export function nextEvent(now: Date, closures: MarketClosures = marketClosures): NextEvent {
  const today = nyParts(now);
  let best: NextEvent | null = null;
  let bestDate: CivilDate | null = null;
  for (let offset = -1; offset <= 2; offset += 1) {
    const date = addDays({ year: today.year, month: today.month, day: today.day }, offset);
    for (const spec of eventsOn(date, closures)) {
      const at = instantAt(date, spec.hour, spec.minute);
      if (at.getTime() <= now.getTime()) continue;
      if (best && at.getTime() >= best.at.getTime()) continue;
      best = {
        key: `${isoKey(date)}T${pad(spec.hour)}:${pad(spec.minute)}`,
        event: spec.event,
        at,
        when: whenLabel(today, date, spec.hour, spec.minute),
      };
      bestDate = date;
    }
  }
  if (!best || !bestDate) throw new ScheduleError('no event found within the search window');
  const gap = indexOf(bestDate) - indexOf(today);
  if (gap !== 0 && gap !== 1) {
    throw new ScheduleError(`next event is ${gap} days away, not today or tomorrow`);
  }
  return best;
}
