/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Bootable } from "@framework/contracts/Bootable";
import { HasApplication } from "@framework/types/HasApplication";
import axios from "axios";
import { Collection } from "discord.js";

class FeatureFlagManager extends HasApplication implements Bootable {
    protected static readonly CentralAPI =
        "https://proxy.sudobot.onesoftnet.eu.org/api/v1/flags/global";
    protected readonly flags = new Collection<string, string>();

    public async boot() {
        // const flagCentralApiUrl =
        //     process.env.FEATURE_FLAG_PROVIDER_URL?.toString() === "none"
        //         ? undefined
        //         : process.env.FEATURE_FLAG_PROVIDER_URL || FeatureFlagManager.CentralAPI;
        const flagCentralApiUrl: string | undefined = undefined;

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
            } catch {
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
