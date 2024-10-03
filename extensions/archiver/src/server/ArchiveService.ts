import { systemPrefix } from "@sudobot/utils/utils";
import { Database } from "bun:sqlite";

class ArchiveService {
    private readonly db: Database;

    public constructor() {
        this.db = new Database(systemPrefix("archive.db"));
    }

    async archive(message: string) {
        // ...
    }

    public close() {
        this.db.close();
    }
}

export default ArchiveService;
