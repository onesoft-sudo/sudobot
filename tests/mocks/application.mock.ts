import Application from "@framework/app/Application";
import { Logger } from "@framework/log/Logger";
import path from "path";
import { version } from '../../package.json';
import { createClient } from "./client.mock";

export const createApplication = () => {
    const client = createClient();
    const application = new Application(path.resolve(__dirname), path.resolve(__dirname, "../../.."), version);

    application.setClient(client);
    application.setLogger(new Logger("test_system", true));
    application.container.bind(Application, {
        key: "application",
        singleton: true,
        factory: () => application
    });

    return application;
};
