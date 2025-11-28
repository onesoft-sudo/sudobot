import BaseApplication from "@framework/app/Application";
import Database from "@main/database/Database";
import { getEnvData } from "@main/env/env";

class Application extends BaseApplication {
    public readonly database = new Database(this, {
        url: getEnvData().SUDOBOT_DATABASE_URL
    });
}

export default Application;
