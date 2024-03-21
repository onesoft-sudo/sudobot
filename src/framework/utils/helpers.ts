import type Application from "../app/Application";
import BaseClient from "../client/BaseClient";
import Container from "../container/Container";

export const container = () => Container.getInstance();
export const application = () => container().resolve<typeof Application>("application");
export const client = () => container().resolve<typeof BaseClient>("client");

// export const service = <T>(key: T) => {
//     if (typeof key === 'string') {
//         client().getServiceByName<T>(key)
//     }
// };

export { application as getApplication, client as getClient, container as getContainer };
