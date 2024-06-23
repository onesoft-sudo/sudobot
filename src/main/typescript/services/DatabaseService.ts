import Application from "@framework/app/Application";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { env } from "@main/env/env";
import * as InfractionSchemas from "@main/models/Infraction";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Name("databaseService")
class DatabaseService extends Service {
    public readonly database: NodePgDatabase<ReturnType<typeof this.buildSchema>>;

    public constructor(application: Application) {
        super(application);

        const pool = new Pool({
            connectionString: env.DB_URL
        });

        this.database = drizzle(pool, {
            schema: this.buildSchema()
        });
    }

    private buildSchema() {
        return {
            ...InfractionSchemas
        };
    }

    public override async boot(): Promise<void> {
        // FIXME: This is just a test
        const list: InfractionSchemas.Infraction[] =
            await this.database.query.infraction.findMany();

        console.log(list);
    }
}

export default DatabaseService;
