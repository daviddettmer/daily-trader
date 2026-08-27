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
  sellAtEt: env("SELL_AT_ET") || "09:29",
  buyBeforeCloseMinutes: Number(env("BUY_BEFORE_CLOSE_MINUTES") || "5"),
  testBuyNotional: Number(env("TEST_BUY_NOTIONAL") || "10"),
  timezone: "America/New_York" as const,
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
