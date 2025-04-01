require("dotenv/config");

async function main() {
    const { drizzle } = await import(String("drizzle-orm/node-postgres"));
    const { migrate } = await import(String("drizzle-orm/node-postgres/migrator"));
    const { default: PG } = await import(String("pg"));

    const pool = new PG.Pool({
        connectionString: process.env.DB_URL
    });

    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "drizzle" });
    await pool.end();
}

main();
