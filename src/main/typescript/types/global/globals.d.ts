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

/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import type Kernel from "@framework/core/Kernel";
import type { User } from "@main/models/User";

declare global {
    var bootDate: number;
    var kernel: Kernel;

    interface Globals {
        user: User;
    }
}

declare module "node:events" {
    interface EventEmitter {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        once(event: string, listener: (...args: any[]) => any): this;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on(event: string, listener: (...args: any[]) => any): this;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        off(event: string, listener: (...args: any[]) => any): this;
        emit(event: string, ...args: unknown[]);
    }
}
