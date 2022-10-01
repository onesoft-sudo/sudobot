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

import DiscordClient from "./Client";
import path from "path";
import fs from "fs";
import { z as zod } from 'zod';

export type config = {
    [key: string]: any;
};

export type configContainer = {
    [guildID: string | number]: config;  
};

export class Config {
    props: configContainer = {};
    client: DiscordClient;
    configPath: string;

    constructor(client: DiscordClient) {
        this.client = client;
        console.log(`ENV: ${process.env.SUDO_PREFIX}`);
        this.configPath = path.resolve(process.env.SUDO_PREFIX ?? this.client.rootdir, "config", "config.json");
        this.load();
    }

    load() {
        fs.readFile(this.configPath, (err, data) => {
            if (err) {
                console.log(err);
            }

            this.props = JSON.parse(data.toString());
        });
    }

    write() {
        fs.writeFile(this.configPath, JSON.stringify(this.props, undefined, ' '), () => null);
    }

    get(key: string) {
        return typeof this.props[this.client.msg!.guild!.id] === 'object' ? this.props[this.client.msg!.guild!.id][key] : null;
    }

    set(key: string, value: any) {
        this.props[this.client.msg!.guild!.id][key] = value;
    }

    schema(_config: string | config) {
        const config = typeof _config === 'string' ? this.props[_config] : _config;
        const snowflake = zod.string().regex(/\d+/, { message: "The given value is not a Snowflake" });

        return zod.object({
            "prefix": zod.string().optional(),
            "debug": zod.boolean().optional(),
            "mute_role": snowflake.optional(),
            "gen_role": snowflake.optional(),
            "logging_channel": snowflake.optional(),
            "logging_channel_join_leave": snowflake.optional(),
            "mod_role": snowflake.optional(),
            "announcement_channel": snowflake.optional(),
            "admin": snowflake.optional(),
            "lockall": zod.array(zod.string()).optional(),
            "warn_notallowed": zod.boolean().optional(),
            "role_commands": zod.record(
                snowflake,
                zod.array(zod.string().min(1))
            ).optional().default({}),
            "autoclear": zod.object({
                "enabled": zod.boolean().optional(),
                "channels": zod.array(snowflake).optional().default(config.autoclear.channels)
            }).optional(),
            "verification": zod.object({
                "enabled": zod.boolean().optional(),
                "role": snowflake.optional()
            }).optional(),
            "welcomer": zod.object({
                "enabled": zod.boolean().optional(),
                "channel": snowflake.optional(),
                "message": zod.string().min(1).or(zod.null()).optional(),
                "randomize": zod.boolean().optional()
            }).optional(),
            "cooldown": zod.object({
                "enabled": zod.boolean().optional(),
                "global": zod.any().optional(),
                "cmds": zod.object({}).optional()
            }).optional(),
            "starboard": zod.object({
                "enabled": zod.boolean().optional(),
                "reactions": zod.number().int().optional(),
                "channel": snowflake.optional()
            }).optional(),
            "autorole": zod.object({
                "enabled": zod.boolean().optional(),
                "roles": zod.array(snowflake).optional().default(config.autorole.roles)
            }).optional(),
            "spam_filter": zod.object({
                "enabled": zod.boolean().optional(),
                "limit": zod.number().int().optional(),
                "time": zod.number().optional(),
                "diff": zod.number().optional(),
                "exclude": zod.array(snowflake).optional().default(config.spam_filter.exclude),
                "samelimit": zod.number().int().optional(),
                "unmute_in": zod.number().optional()
            }).optional(),
            "raid": zod.object({
                "enabled": zod.boolean().optional(),
                "max_joins": zod.number().int().optional(),
                "time": zod.number().optional(),
                "channels": zod.array(snowflake).optional().default(config.raid.channels),
                "exclude": zod.boolean().optional()
            }).optional(),
            "global_commands": zod.array(zod.string()).optional().default(config.global_commands),
            "filters": zod.object({
                "ignore_staff": zod.boolean().optional(),
                "chars_repeated": zod.number().int().optional(),
                "words_repeated": zod.number().int().optional(),
                "words": zod.array(zod.string()).optional().default(config.filters.words),
                "tokens": zod.array(zod.string()).optional().default(config.filters.tokens),
                "invite_message": zod.string().optional(),
                "words_excluded": zod.array(snowflake).optional().default(config.filters.words_excluded),
                "domain_excluded": zod.array(snowflake).optional().default(config.filters.domain_excluded),
                "invite_excluded": zod.array(snowflake).optional().default(config.filters.invite_excluded),
                "words_enabled": zod.boolean().optional(),
                "invite_enabled": zod.boolean().optional(),
                "domain_enabled": zod.boolean().optional(),
                "regex": zod.boolean().optional(),
                "file_mimes_excluded": zod.array(zod.string()).optional().default(config.filters.file_mimes_excluded),
                "file_types_excluded": zod.array(zod.string()).optional().default(config.filters.file_types_excluded),
                "domains": zod.array(zod.string()).optional().default(config.filters.domains),
                "regex_patterns": zod.array(zod.string()).optional().default(config.filters.regex_patterns),
                "rickrolls_enabled": zod.boolean().optional(),
                "pings": zod.number().int().optional()
            }).optional()
        });
    }
}
