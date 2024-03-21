import type Client from "../../core/Client";
import type Application from "../app/Application";
import Container from "../container/Container";

export const container = () => Container.getInstance();
export const application = () => container().resolve<typeof Application>("application");
export const client = () => container().resolve<typeof Client>("client");

export { application as getApplication, client as getClient, container as getContainer };
