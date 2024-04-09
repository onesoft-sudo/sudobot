import path from "path";
import Application from "../../src/framework/app/Application";
import { Logger } from "../../src/framework/log/Logger";
import { createClient } from "./client.mock";

export const createApplication = () => {
    const client = createClient();
    const application = new Application(path.resolve(__dirname, "../../.."));

    application.setClient(client);
    application.setLogger(new Logger("test_system", true));
    application.container.bind(Application, {
        key: "application",
        singleton: true,
        factory: () => application
    });

    return application;
};
