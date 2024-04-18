export interface ConfigurationManagerServiceInterface {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: Record<string, Record<string, any> | undefined>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systemConfig: Record<string, any>;
}
