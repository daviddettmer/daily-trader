export const config = {
  appPassword: process.env.APP_PASSWORD ?? "",
  appUsername: process.env.APP_USERNAME ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  alpacaApiKey: process.env.ALPACA_API_KEY ?? "",
  alpacaSecretKey: process.env.ALPACA_SECRET_KEY ?? "",
  alpacaPaper: process.env.ALPACA_PAPER !== "false",
  sellAtEt: process.env.SELL_AT_ET ?? "09:29",
  buyBeforeCloseMinutes: Number(process.env.BUY_BEFORE_CLOSE_MINUTES ?? "5"),
  testBuyNotional: Number(process.env.TEST_BUY_NOTIONAL ?? "10"),
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
