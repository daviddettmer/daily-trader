function env(name: string) {
  const raw = process.env[name] ?? "";
  // Strip accidental quotes/whitespace from Vercel or .env pastes
  return raw.trim().replace(/^["']|["']$/g, "");
}

export const config = {
  appPassword: env("APP_PASSWORD"),
  appUsername: env("APP_USERNAME"),
  sessionSecret: env("SESSION_SECRET"),
  cronSecret: env("CRON_SECRET"),
  alpacaApiKey: env("ALPACA_API_KEY"),
  alpacaSecretKey: env("ALPACA_SECRET_KEY"),
  alpacaPaper: env("ALPACA_PAPER") !== "false",
  sellAtEt: env("SELL_AT_ET") || "08:30",
  sellWindowStartEt: env("SELL_WINDOW_START_ET") || "08:00",
  sellWindowEndEt: env("SELL_WINDOW_END_ET") || "10:31",
  buyAtEt: env("BUY_AT_ET") || "14:59",
  buyWindowStartEt: env("BUY_WINDOW_START_ET") || "14:00",
  buyWindowEndEt: env("BUY_WINDOW_END_ET") || "16:01",
  testBuyNotional: Number(env("TEST_BUY_NOTIONAL") || "10"),
  timezone: "America/New_York" as const,
  // Vercel sets VERCEL_ENV=preview on Preview deployments (no manual env needed)
  isPreview:
    env("VERCEL_ENV") === "preview" || env("APP_ENV") === "preview",
  // Optional: daytime cron test (CRON_TEST_MODE=true)
  cronTestMode: env("CRON_TEST_MODE") === "true",
  cronTestBuyEt: env("CRON_TEST_BUY_ET") || "10:00",
  cronTestSellEt: env("CRON_TEST_SELL_ET") || "11:00",
};

export function assertConfig() {
  const missing: string[] = [];
  if (!config.appPassword) missing.push("APP_PASSWORD");
  if (!config.sessionSecret) missing.push("SESSION_SECRET");
  if (!config.cronSecret) missing.push("CRON_SECRET");
  if (!config.alpacaApiKey) missing.push("ALPACA_API_KEY");
  if (!config.alpacaSecretKey) missing.push("ALPACA_SECRET_KEY");
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
