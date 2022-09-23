
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

import DiscordClient from "../../client/Client";

export default abstract class BaseCLICommand {
    requiredArgs = 0;
    requiredOptions = 0;

    constructor(protected name: string, protected category: string, protected aliases: string[] = []) {

    }

    getName(): string {
        return this.name;
    }

    getCategory(): string {
        return this.category;
    }

    getAliases(): string[] {
        return this.aliases;
    }

    public abstract run(client: DiscordClient, argv?: string[], args?: string[], options?: string[]): Promise<void>;
}