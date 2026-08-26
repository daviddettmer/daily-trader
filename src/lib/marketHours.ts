import { addDays, format, parse, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { config } from "./config";
import { getCalendar, getClock } from "./alpaca";

export type TradingSession = {
  date: string;
  open: Date;
  close: Date;
};

function parseEtTimeOnDate(dateStr: string, timeEt: string) {
  const parsed = parse(`${dateStr} ${timeEt}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(parsed, config.timezone);
}

function parseTimeParts(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

export async function getUpcomingSessions(daysAhead = 14): Promise<TradingSession[]> {
  const start = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const end = format(addDays(new Date(), daysAhead), "yyyy-MM-dd");

  try {
    const calendar = await getCalendar(start, end);

    return calendar.map((day: { date: string; open: string; close: string }) => ({
      date: day.date,
      open: parseEtTimeOnDate(day.date, day.open),
      close: parseEtTimeOnDate(day.date, day.close),
    })) as TradingSession[];
  } catch {
    return [];
  }
}

export function getSellSubmitTime(session: TradingSession) {
  const { hours, minutes } = parseTimeParts(config.sellAtEt);
  const zoned = toZonedTime(session.open, config.timezone);
  zoned.setHours(hours, minutes, 0, 0);
  return fromZonedTime(zoned, config.timezone);
}

export function getBuySubmitTime(session: TradingSession) {
  const zoned = toZonedTime(session.close, config.timezone);
  zoned.setMinutes(zoned.getMinutes() - config.buyBeforeCloseMinutes);
  return fromZonedTime(zoned, config.timezone);
}

export async function getNextBuySession(now = new Date()) {
  const sessions = await getUpcomingSessions(21);
  for (const session of sessions) {
    const buyAt = getBuySubmitTime(session);
    if (buyAt > now) return session;
  }
  return sessions.at(-1) ?? null;
}

export async function getNextSellSession(now = new Date()) {
  const sessions = await getUpcomingSessions(21);
  for (const session of sessions) {
    const sellAt = getSellSubmitTime(session);
    if (sellAt > now) return session;
  }
  return sessions.at(-1) ?? null;
}

export async function isWithinSellWindow(now = new Date()) {
  const clock = await getClock();
  if (!clock.is_open && now < new Date(clock.next_open)) {
    const sessions = await getUpcomingSessions(7);
    const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
    const session = sessions.find((s) => s.date === today);
    if (!session) return false;
    const sellAt = getSellSubmitTime(session);
    const windowStart = new Date(sellAt.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(sellAt.getTime() + 3 * 60 * 1000);
    return now >= windowStart && now <= windowEnd;
  }

  if (!clock.is_open) return false;

  const sessions = await getUpcomingSessions(7);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const session = sessions.find((s) => s.date === today);
  if (!session) return false;

  const sellAt = getSellSubmitTime(session);
  const windowStart = new Date(sellAt.getTime() - 2 * 60 * 1000);
  const windowEnd = new Date(sellAt.getTime() + 3 * 60 * 1000);
  return now >= windowStart && now <= windowEnd;
}

export async function isWithinBuyWindow(now = new Date()) {
  const clock = await getClock();
  if (!clock.is_open) return false;

  const sessions = await getUpcomingSessions(7);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const session = sessions.find((s) => s.date === today);
  if (!session) return false;

  const buyAt = getBuySubmitTime(session);
  const windowStart = new Date(buyAt.getTime() - 2 * 60 * 1000);
  const windowEnd = session.close;
  return now >= windowStart && now <= windowEnd;
}

export function formatEtDateTime(date: Date) {
  return formatInTimeZone(date, config.timezone, "EEE, MMM d h:mm a 'ET'");
}

export function formatEtTime(date: Date) {
  return formatInTimeZone(date, config.timezone, "h:mm a 'ET'");
}
