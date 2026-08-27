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

function isWithinTestEtWindow(
  now: Date,
  timeEt: string,
  leadMinutes: number,
  trailMinutes: number
) {
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const target = parseEtTimeOnDate(today, timeEt);
  const windowStart = new Date(target.getTime() - leadMinutes * 60 * 1000);
  const windowEnd = new Date(target.getTime() + trailMinutes * 60 * 1000);
  return now >= windowStart && now <= windowEnd;
}

export async function isWithinSellWindow(now = new Date()) {
  if (config.cronTestMode) {
    const clock = await getClock();
    if (!clock.is_open) return false;
    return isWithinTestEtWindow(
      now,
      config.cronTestSellEt,
      config.sellCronWindowMinutes,
      60
    );
  }

  const sessions = await getUpcomingSessions(7);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const session = sessions.find((s) => s.date === today);
  if (!session) return false;

  const sellAt = getSellSubmitTime(session);
  const windowStart = new Date(
    sellAt.getTime() - config.sellCronWindowMinutes * 60 * 1000
  );
  const windowEnd = new Date(sellAt.getTime() + 15 * 60 * 1000);

  const clock = await getClock();
  if (!clock.is_open) {
    // Pre-open: allow the morning cron hour (e.g. Hobby fires ~9:00–9:59 AM ET)
    return now >= windowStart && now <= windowEnd;
  }

  return now >= windowStart && now <= windowEnd;
}

export async function isWithinBuyWindow(now = new Date()) {
  const clock = await getClock();
  if (!clock.is_open) return false;

  if (config.cronTestMode) {
    return isWithinTestEtWindow(
      now,
      config.cronTestBuyEt,
      config.buyCronWindowMinutes,
      60
    );
  }

  const sessions = await getUpcomingSessions(7);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const session = sessions.find((s) => s.date === today);
  if (!session) return false;

  const buyAt = getBuySubmitTime(session);
  // Target buy ~3:55 PM ET; accept cron anytime in the last hour before close (Hobby plan)
  const windowStart = new Date(
    session.close.getTime() - config.buyCronWindowMinutes * 60 * 1000
  );
  const windowEnd = session.close;
  const inWindow = now >= windowStart && now <= windowEnd;

  // Also accept if we're within 2 min of the ideal buy time (Pro fires closer to schedule)
  const tightStart = new Date(buyAt.getTime() - 2 * 60 * 1000);
  if (now >= tightStart && now <= windowEnd) return true;

  return inWindow;
}

export function formatEtDateTime(date: Date) {
  return formatInTimeZone(date, config.timezone, "EEE, MMM d h:mm a 'ET'");
}

export function formatEtTime(date: Date) {
  return formatInTimeZone(date, config.timezone, "h:mm a 'ET'");
}
