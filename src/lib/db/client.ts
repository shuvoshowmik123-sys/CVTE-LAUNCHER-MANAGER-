import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __launcherManagerSql: ReturnType<typeof postgres> | undefined;
}

function getClient() {
  if (!globalThis.__launcherManagerSql) {
    globalThis.__launcherManagerSql = postgres(getEnv().DATABASE_URL, {
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__launcherManagerSql;
}

export const db = drizzle(getClient(), { schema });
export type Database = typeof db;
