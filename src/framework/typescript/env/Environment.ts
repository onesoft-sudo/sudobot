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

import type { z, ZodSchema } from "zod";

class Environment {
    public static isProduction(): boolean {
        return process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod";
    }

    public static isDevelopment(): boolean {
        return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";
    }

    public static isTest(): boolean {
        return process.env.NODE_ENV === "test";
    }

    public static isBun(): boolean {
        return !!process.isBun;
    }

    public static variables(): NodeJS.ProcessEnv {
        return process.env;
    }

    
    public static parseVariables<T extends ZodSchema>(schema: T): z.infer<T> {
        return schema.parse(this.variables());
    }
}

export default Environment;
