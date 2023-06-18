/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

// TODO

import { MessageRule } from "../automod/MessageRules";

export default interface ConfigInterface {
    prefix: string;
    debug: boolean;
    mod_role: string;
    mute_role: string;
    gen_role: string;
    announcement_channel: string;
    logging_channel: string;
    logging_channel_join_leave: string;
    admin: string;
    reports: {
        enabled: boolean,
        mod_only: boolean,
        reporters: string[],
        reporter_roles: string[]
    },
    autoclear: {
        enabled: boolean;
        channels: string[]
    },
    message_rules: {
        enabled: boolean,
        disabled_channels: string[],
        rules: MessageRule[]
    }
}