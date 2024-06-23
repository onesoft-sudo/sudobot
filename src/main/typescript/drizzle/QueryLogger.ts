import { Logger } from "@framework/log/Logger";
import chalk from "chalk";
import type { Logger as DrizzleLogger } from "drizzle-orm";

class QueryLogger implements DrizzleLogger {
    private readonly logger = new Logger("drizzle", true);

    public logQuery(query: string, params: unknown[]): void {
        this.logger.info(
            `${chalk.green("Query")}: ${query} | ${chalk.white.bold("Params")}: ${JSON.stringify(params)}`
        );
    }
}

export default QueryLogger;
