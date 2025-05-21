import type { SettingData } from "../core/BlazeBuild";

class Settings {
    public readonly build: SettingData["build"];

    public constructor(data: SettingData) {
        this.build = new Proxy(data.build, {
            get: (target, prop) => {
                if (prop in target) {
                    return target[prop as keyof SettingData["build"]];
                } else {
                    throw new Error(`Property ${String(prop)} does not exist.`);
                }
            },
            set: (target, prop, value) => {
                if (prop in target) {
                    target[prop as keyof typeof target] = value as never;
                    return true;
                } else {
                    throw new Error(`Property ${String(prop)} does not exist.`);
                }
            }
        });
    }
}

export default Settings;
