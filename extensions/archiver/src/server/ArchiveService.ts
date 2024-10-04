import { systemPrefix } from "@sudobot/utils/utils";
import { existsSync } from "fs";
import { ArchiveMessagePayload } from "src/types/ArchiveMessagePayload";

class ArchiveService implements Disposable {
    private _db?: Awaited<ReturnType<typeof ArchiveService.createDatabase>>;

    private constructor() {}

    public get db() {
        if (!this._db) {
            throw new Error("Database not initialized");
        }

        return this._db;
    }

    private prepare(query: string, params: string[], results = true) {
        const db = this.db as unknown as import("bun:sqlite").Database;
        const compiled = db.prepare(query, params);

        if (results) {
            return compiled.all();
        }

        compiled.run();
    }

    private static createTables(_db: Awaited<ReturnType<typeof ArchiveService.createDatabase>>) {
        const db = _db as unknown as import("bun:sqlite").Database;

        db.transaction(() => {
            db.run(
                `CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    userId TEXT,
                    guildId TEXT,
                    content TEXT,
                    timestamp INTEGER
                );
                `
            );

            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT
                );`);
        })();
    }

    public async archive({ author, guild, message }: ArchiveMessagePayload) {
        const { id: userId } = author;
        const { id: guildId } = guild;
        const { id, content, timestamp } = message;

        this.prepare(
            `INSERT INTO messages (id, userId, guildId, content, timestamp) VALUES (?, ?, ?, ?, ?);`,
            [id, userId, guildId, content, timestamp],
            false
        );

        this.prepare(
            `INSERT OR IGNORE INTO users (id, username) VALUES (?, ?);`,
            [userId, author.username],
            false
        );
    }

    public close() {
        this._db?.close();
    }

    public static async create() {
        const service = new ArchiveService();
        service._db = await ArchiveService.createDatabase();
        return service;
    }

    private static async createDatabase() {
        let db;
        const dbPath = systemPrefix("archive.db");
        const createTables = !existsSync(dbPath);

        if (process.isBun) {
            const { Database } = await import("bun:sqlite");
            db = new Database(dbPath, {
                create: true,
                strict: true,
                readwrite: true
            });
        } else {
            const { default: Database } = await import("better-sqlite3");
            db = new Database(dbPath);
        }

        if (createTables) {
            this.createTables(db);
        }

        return db;
    }

    public [Symbol.dispose]() {
        this.close();
    }
}

export default ArchiveService;
