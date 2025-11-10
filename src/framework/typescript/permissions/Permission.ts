/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import type Application from "@framework/app/Application";
import type { ConstructorOf } from "@framework/container/Container";
import Singleton from "@framework/objects/Singleton";
import type { Awaitable, GuildMember, User } from "discord.js";

abstract class Permission extends Singleton {
    public abstract readonly name: string;

    public constructor(protected readonly application: Application) {
        super();
    }

    public static getInstance<T extends typeof Permission>(this: T, application: Application): InstanceType<T> {
        if (!this.instance) {
            this.instance = application.container.get(this as unknown as ConstructorOf<T>);
        }

        return this.instance as InstanceType<T>;
    }

    public hasMember(member: GuildMember): Awaitable<boolean> {
        return this.hasUser(member.user);
    }

    public abstract hasUser(user: User): Awaitable<boolean>;
}

export default Permission;
