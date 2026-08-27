import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type CronRoute = "buy" | "sell";
export type CronStatus = "ok" | "skipped" | "error" | "unauthorized";

export async function recordCronRun(input: {
  route: CronRoute;
  status: CronStatus;
  reason?: string | null;
  error?: string | null;
  details?: unknown;
}) {
  try {
    await db.cronRun.create({
      data: {
        route: input.route,
        status: input.status,
        reason: input.reason ?? null,
        error: input.error ?? null,
        details:
          input.details === undefined
            ? undefined
            : (input.details as Prisma.InputJsonValue),
      },
    });
  } catch (err) {
    console.error("[cronLog] failed to write", err);
  }
}

export async function getCronRuns(limit = 200) {
  return db.cronRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
