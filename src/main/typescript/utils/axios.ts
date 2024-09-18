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

import type Application from "@framework/app/Application";
import { Logger } from "@framework/log/Logger";
import type { AxiosInstance } from "axios";
import axios from "axios";

const logger = new Logger("http", true);
let _axiosClient: AxiosInstance;

export const createAxiosClient = (application: Application) => {
    const configUserAgent =
        process.env.HTTP_USER_AGENT === null
            ? undefined
            : (process.env.HTTP_USER_AGENT ?? `SudoBot/${application.version}`);

    _axiosClient = axios.create({
        headers: {
            "Accept-Encoding": process.isBun ? "gzip" : undefined,
            "User-Agent": configUserAgent
        }
    });

    _axiosClient.interceptors.request.use(config => {
        logger.info(
            `${config.method?.toUpperCase()} ${config.url} - ${(config.headers["User-Agent"] as string) ?? "No User-Agent"}`
        );
        return config;
    });

    return _axiosClient;
};

export const getAxiosClient = () => _axiosClient;
