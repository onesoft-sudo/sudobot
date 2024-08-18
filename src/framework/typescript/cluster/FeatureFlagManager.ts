import type { Bootable } from "@framework/contracts/Bootable";
import { HasApplication } from "@framework/types/HasApplication";
import axios from "axios";
import { Collection } from "discord.js";

class FeatureFlagManager extends HasApplication implements Bootable {
    protected static readonly CentralAPI = "https://proxy.sudobot.onesoftnet.eu.org/api/v1/flags/global";
    protected readonly flags = new Collection<string, string>();

    public async boot() {
        const flagCentralApiUrl =
            process.env.FEATURE_FLAG_PROVIDER_URL?.toString() === "none"
                ? undefined
                : process.env.FEATURE_FLAG_PROVIDER_URL || FeatureFlagManager.CentralAPI;

        if (flagCentralApiUrl) {
            try {
                const response = await axios.get(flagCentralApiUrl, {
                    headers: {
                        "Content-Encoding": "identity"
                    }
                });

                if (response.status !== 200) {
                    throw new Error(
                        `Failed to fetch feature flags from the central API. Status code: ${response.status}`
                    );
                }

                const flags = response.data?.flags as Record<
                    string,
                    {
                        treatment: string;
                        treatments: Record<string, string>;
                    }
                >;

                for (const key in flags) {
                    this.flags.set(key, flags[key].treatment);
                }
            } catch (error) {
                this.application.logger.error("Failed to fetch feature flags from the central API");
                return;
            }
        }
    }

    public isControlEnabled(key: string) {
        return this.flags.get(key) === "control";
    }

    public getValue(key: string) {
        return this.flags.get(key);
    }
}

export default FeatureFlagManager;
