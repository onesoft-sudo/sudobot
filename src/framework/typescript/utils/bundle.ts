import type Application from "@framework/app/Application";
import type Command from "@framework/commands/Command";
import type EventListener from "@framework/events/EventListener";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import type Service from "@framework/services/Service";
import type { Events } from "@framework/types/ClientEvents";

export const BUNDLE_DATA_SYMBOL = Symbol("BundleData");
export type BundleData = {
    services: Record<string, new (application: Application) => Service>;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    classes: Record<string, Function>;
    events: Record<string, new (application: Application) => EventListener<Events>>;
    commands: Record<string, new (application: Application, permissionManagerService: PermissionManagerServiceInterface) => Command>;
    resources: Record<string, unknown>;
};

export const getBundleData = () => (global as { [BUNDLE_DATA_SYMBOL]?: BundleData })[BUNDLE_DATA_SYMBOL];
export const hasBundleData = () => BUNDLE_DATA_SYMBOL in global;
