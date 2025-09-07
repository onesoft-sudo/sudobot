import type Application from "@framework/app/Application";
import type DatabaseService from "@sudobot/services/DatabaseService";
import type { drizzle } from "drizzle-orm/node-postgres";

export function castDrizzle(databaseService: Application["database"]) {
    return (databaseService as DatabaseService).drizzle as unknown as ReturnType<typeof drizzle>;
}
