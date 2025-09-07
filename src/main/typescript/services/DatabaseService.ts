/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import Application from "@framework/app/Application";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { BUG } from "@framework/utils/devflow";
import QueryLogger from "@main/drizzle/QueryLogger";
import { getEnvData } from "@main/env/env";
import * as AFKEntrySchemas from "@main/models/AFKEntry";
import * as ChannelLockSchemas from "@main/models/ChannelLock";
import * as CommandPermissionOverwriteSchemas from "@main/models/CommandPermissionOverwrite";
import * as EarlyMessageInspectionEntrySchemas from "@main/models/EarlyMessageInspectionEntry";
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
    public readonly drizzleGeneric: ReturnType<typeof drizzle>;
    public readonly pool: Pool;

    public constructor(application: Application) {
        super(application);

        this.pool = new Pool({
            connectionString: getEnvData().DB_URL
        });

        this.drizzle = drizzle(this.pool, {
            schema: {
                ...this.buildSchema(),
                ...this.getExtensionSchemas()
            },
            logger: new QueryLogger()
        } as { logger: QueryLogger });

        this.drizzleGeneric = this.drizzle as unknown as typeof this.drizzleGeneric;
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
            ...VerificationRecordSchemas,
            ...EarlyMessageInspectionEntrySchemas
        };
    }

    private getExtensionSchemas() {
        const result: Record<string, unknown> = {};

        for (const extension of this.application.service("extensionManager").getInstalledExtensions()) {
            this.application.logger.debug("Loading models from extension: ", extension.id);
            const models = extension.databaseModels();

            for (const key of Object.getOwnPropertyNames(models)) {
                this.application.logger.debug("Model: ", key);

                if (key in result) {
                    BUG(
                        "An extension to overwrite a model previously registered in map: ",
                        key,
                        ", extension: ",
                        extension.id
                    );
                }

                result[key] = models[key];
            }
        }

        return result;
    }

    public override async boot(): Promise<void> {
        // Test connection
        await this.drizzle.execute(sql`SELECT 1`);
    }

    public get query(): NodePgDatabase<ReturnType<typeof this.buildSchema>>["query"] {
        return this.drizzle.query;
    }
}

export default DatabaseService;
