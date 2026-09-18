export * from "./schemas";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { configs } from "../configs";
import * as schema from "./schemas";

import { Pool } from "pg";

const pool = new Pool({
   connectionString: configs.databaseUrl,
});
export const db = drizzle({ client: pool, relations: schema.relations });
// Ping the DB to verify connectivity:
export const testDbConnection = async () => {
   await db.execute(sql`SELECT 1`);
};
