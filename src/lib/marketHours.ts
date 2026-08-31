import { addDays, format, parse, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { config } from "./config";
import { getCalendar, getClock } from "./alpaca";

export type TradingSession = {
  date: string;
  open: Date;
  close: Date;
};

const HOBBY_CRON_HOUR_MS = 60 * 60 * 1000;

function parseEtTimeOnDate(dateStr: string, timeEt: string) {
  const parsed = parse(`${dateStr} ${timeEt}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(parsed, config.timezone);
}

function parseTimeParts(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/** Full ET clock hour containing `timeEt` (e.g. 08:30 → 8:00–8:59 AM). Matches Vercel Hobby. */
function isWithinEtClockHour(now: Date, timeEt: string) {
  const { hours } = parseTimeParts(timeEt);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const hourStart = parseEtTimeOnDate(
    today,
    `${String(hours).padStart(2, "0")}:00`
  );
  const hourEnd = new Date(hourStart.getTime() + HOBBY_CRON_HOUR_MS);
  return now >= hourStart && now < hourEnd;
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
  const { hours, minutes } = parseTimeParts(config.buyAtEt);
  const zoned = toZonedTime(session.close, config.timezone);
  zoned.setHours(hours, minutes, 0, 0);
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

export type WindowCheck = {
  inWindow: boolean;
  reason?: string;
  hint?: string;
};

function etClockHourWindow(timeEt: string) {
  const { hours } = parseTimeParts(timeEt);
  return `${String(hours).padStart(2, "0")}:00`;
}

/** Start inclusive, end exclusive (e.g. 08:00–10:31 means >= 8:00 and < 10:31). */
function isWithinEtTimeRange(now: Date, startEt: string, endBeforeEt: string) {
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  const start = parseEtTimeOnDate(today, startEt);
  const end = parseEtTimeOnDate(today, endBeforeEt);
  return now >= start && now < end;
}

export async function checkSellWindow(now = new Date()): Promise<WindowCheck> {
  if (config.cronTestMode) {
    if (!isWithinEtClockHour(now, etClockHourWindow(config.cronTestSellEt))) {
      return {
        inWindow: false,
        reason: "outside_sell_hour",
        hint: `Cron test mode: sell window is the ${config.cronTestSellEt} ET hour.`,
      };
    }
  } else if (
    !isWithinEtTimeRange(
      now,
      config.sellWindowStartEt,
      config.sellWindowEndEt
    )
  ) {
    return {
      inWindow: false,
      reason: "outside_sell_window",
      hint: `Sell cron runs from ${config.sellWindowStartEt} ET up to (but not including) ${config.sellWindowEndEt} ET.`,
    };
  }

  const sessions = await getUpcomingSessions(7);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  if (!sessions.some((s) => s.date === today)) {
    return {
      inWindow: false,
      reason: "no_trading_session",
      hint: "Alpaca calendar has no session for today (holiday or calendar API error).",
    };
  }

  return { inWindow: true };
}

export async function checkBuyWindow(now = new Date()): Promise<WindowCheck> {
  const clock = await getClock();
  if (!clock.is_open) {
    return {
      inWindow: false,
      reason: "market_closed",
      hint: "Buy cron only runs while the regular session is open.",
    };
  }

  const sessions = await getUpcomingSessions(7);
  const today = formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
  if (!sessions.some((s) => s.date === today)) {
    return {
      inWindow: false,
      reason: "no_trading_session",
      hint: "Alpaca calendar has no session for today (holiday or calendar API error).",
    };
  }

  if (config.cronTestMode) {
    if (!isWithinEtClockHour(now, etClockHourWindow(config.cronTestBuyEt))) {
      return {
        inWindow: false,
        reason: "outside_buy_hour",
        hint: `Cron test mode: buy window is the ${config.cronTestBuyEt} ET hour.`,
      };
    }
  } else if (
    !isWithinEtTimeRange(
      now,
      config.buyWindowStartEt,
      config.buyWindowEndEt
    )
  ) {
    return {
      inWindow: false,
      reason: "outside_buy_window",
      hint: `Buy cron runs from ${config.buyWindowStartEt} ET up to (but not including) ${config.buyWindowEndEt} ET.`,
    };
  }

  return { inWindow: true };
}

export async function isWithinSellWindow(now = new Date()) {
  const result = await checkSellWindow(now);
  return result.inWindow;
}

export async function isWithinBuyWindow(now = new Date()) {
  const result = await checkBuyWindow(now);
  return result.inWindow;
}

export function formatEtDateTime(date: Date) {
  return formatInTimeZone(date, config.timezone, "EEE, MMM d h:mm a 'ET'");
}

export function formatEtTime(date: Date) {
  return formatInTimeZone(date, config.timezone, "h:mm a 'ET'");
}
