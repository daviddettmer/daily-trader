# Daily Trader

Overnight compounding stock bot on Vercel. Buy near market close, sell at the next regular open, reinvest proceeds, and manage multiple tickers from a password-protected dashboard.

## Features

- Multi-ticker watchlist with starting dollar amounts
- Automatic buy-at-close / sell-at-open via Vercel Cron + Alpaca
- Morning sell submitted at **9:29 AM ET** with `extended_hours: false` (fills at regular open)
- Compounding: sell proceeds become the next buy amount
- Add money mid-cycle (queued until after the next sell if in position)
- Dashboard strategy total, growth chart, next trade previews
- Per-symbol trade history (last 30 days from Alpaca)

## Stack

- Next.js 15 (App Router) + TypeScript
- Alpaca Trade API (`@alpacahq/alpaca-trade-api`)
- Prisma + PostgreSQL
- Recharts

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Fill in:

- `DATABASE_URL` — Postgres connection string (Neon or Vercel Postgres)
- `APP_PASSWORD` — dashboard login password
- `SESSION_SECRET` — long random string
- `CRON_SECRET` — long random string for cron auth
- `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` — Alpaca paper keys
- Optional: `APP_USERNAME`, `ALPACA_PAPER=false` for live

3. Push schema:

```bash
npm run db:push
```

4. Run locally:

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

## Deploy to Vercel

1. Import the repo in Vercel
2. Add the same env vars in Project Settings
3. Attach a Postgres database and set `DATABASE_URL`
4. Deploy — `vercel.json` configures weekday crons:

- `/api/cron/sell` at `29 13 * * 1-5` UTC (9:29 AM EDT)
- `/api/cron/buy` at `55 19 * * 1-5` UTC (3:55 PM EDT)

Cron requests must include:

```http
Authorization: Bearer <CRON_SECRET>
```

Vercel Cron sends this automatically when `CRON_SECRET` is set in the project.

### DST note

Cron schedules are UTC. After switching to EST, update `vercel.json` cron times (sell → `29 14`, buy → `55 20`) or use Vercel Pro for denser schedules. Route handlers also gate on Alpaca clock windows.

## Manual cron test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sell
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/buy
```

## Test orders

On any symbol detail page (`/symbols/SPY`), use **Test buy** / **Test sell** to place orders immediately and verify Alpaca connectivity. Works in both paper and live mode (live shows a warning). Test buy always uses `TEST_BUY_NOTIONAL` (default $10). Best tested during regular market hours.

## Strategy equity

Dashboard total includes only watchlist symbols:

- In position → Alpaca market value
- Flat → `nextBuyNotional + pendingDeposit`

## Safety

- Paper trading is the default (`ALPACA_PAPER=true`)
- Cron routes require `CRON_SECRET`
- UI requires password session
