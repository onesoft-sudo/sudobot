import Application from "@framework/app/Application";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import QueryLogger from "@main/drizzle/QueryLogger";
import { env } from "@main/env/env";
import * as AFKEntrySchemas from "@main/models/AFKEntry";
import * as ChannelLockSchemas from "@main/models/ChannelLock";
import * as CommandPermissionOverwriteSchemas from "@main/models/CommandPermissionOverwrite";
import * as InfractionSchemas from "@main/models/Infraction";
import * as MuteRecordSchemas from "@main/models/MuteRecord";
import * as PermissionLevelSchemas from "@main/models/PermissionLevel";
import * as PermissionOverwriteSchemas from "@main/models/PermissionOverwrite";
import * as QueueSchemas from "@main/models/Queue";
import * as ReactionRoleSchemas from "@main/models/ReactionRole";
import * as SnippetSchemas from "@main/models/Snippet";
import * as UserSchemas from "@main/models/User";
import * as VerificationEntrySchemas from "@main/models/VerificationEntry";
import * as VerificationRecordSchemas from "@main/models/VerificationRecord";
import { sql } from "drizzle-orm";

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Name("databaseService")
class DatabaseService extends Service {
    public readonly drizzle: NodePgDatabase<ReturnType<typeof this.buildSchema>>;

    public constructor(application: Application) {
        super(application);

        const pool = new Pool({
            connectionString: env.DB_URL
        });

        this.drizzle = drizzle(pool, {
            schema: this.buildSchema(),
            logger: new QueryLogger()
        });
    }

    private buildSchema() {
        return {
            ...InfractionSchemas,
            ...AFKEntrySchemas,
            ...ChannelLockSchemas,
            ...CommandPermissionOverwriteSchemas,
            ...MuteRecordSchemas,
            ...PermissionLevelSchemas,
            ...PermissionOverwriteSchemas,
            ...QueueSchemas,
            ...ReactionRoleSchemas,
            ...SnippetSchemas,
            ...UserSchemas,
            ...VerificationEntrySchemas,
            ...VerificationRecordSchemas
        };
    }

    public override async boot(): Promise<void> {
        // Test connection
        await this.drizzle.execute(sql`SELECT 1`);
    }

    public get query() {
        return this.drizzle.query;
    }
}

export default DatabaseService;
