/**
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

import bcrypt from "bcrypt";
import chalk from "chalk";
import { Server, Socket } from "socket.io";
import Client from "../core/Client";
import Service from "../core/Service";
import { LogLevel, logInfo, logStringWithLevel, logWarn } from "../utils/logger";

export const name = "logServer";

export default class LogServer extends Service {
    public readonly MAX_CONNECTIONS = 5;
    protected connections = 0;
    private _io?: Server;
    public readonly sockets: Array<Socket> = [];
    public readonly attributes: Array<{ colorize?: boolean }> = [];

    constructor(client: Client) {
        super(client);

        if (!client.configManager.systemConfig.log_server?.auto_start) {
            return;
        }

        this.initialize();
    }

    get io() {
        return this._io;
    }

    initialize() {
        this._io = new Server();
        this.setupListeners();
    }

    close() {
        this.io?.close();
        this._io = undefined;
    }

    isAuthorized(socket: Socket) {
        const { authorization } = socket.request.headers;
        const [type, password] = authorization?.split(/\s+/) ?? ["", ""];

        if (type !== "Bearer") {
            socket.send("[error] Only bearer tokens are supported!");
            socket.disconnect(true);
            return false;
        }

        if (!bcrypt.compareSync(password, process.env.LOG_SERVER_PASSWORD ?? Math.random().toString())) {
            socket.send("[error] Authentication failed");
            socket.disconnect(true);
            return false;
        }

        return true;
    }

    setupListeners() {
        this.io?.on("connection", socket => {
            if (this.connections >= this.MAX_CONNECTIONS) {
                socket.disconnect();
                return;
            }

            this.connections++;
            logInfo("New client connected to the log server", socket.id);

            socket.on("disconnect", reason => {
                this.connections--;
                logInfo("Client Disonnected from log server: ", socket.id, reason);
                const index = this.sockets.findIndex(s => s.id === socket.id);

                if (index !== -1) {
                    this.sockets.splice(index, 1);
                    this.attributes.splice(index, 1);
                }
            });

            if (!this.isAuthorized(socket)) {
                logWarn("Unauthorized client attempted to connect to the log server", socket.id);
                return;
            }

            const colorize = socket.request.headers["x-colorize"] === "Yes";

            socket.write(`${colorize ? chalk.cyan("[info]") : "[info]"} Connection Accepted`);

            this.sockets.push(socket);
            this.attributes.push({
                colorize
            });
        });
    }

    send(message: string) {
        for (const socket of this.sockets) {
            socket.send(message);
        }
    }

    log(level: LogLevel, message: string) {
        this.sockets.forEach((socket, index) => {
            const { colorize } = this.attributes[index] ?? {};

            if (colorize) {
                socket.send(logStringWithLevel(level, message));
            } else {
                socket.send(`[system:${LogLevel[level].toLowerCase()}] ${message}`);
            }
        });
    }

    listen() {
        let port = process.env.LOG_SERVER_PORT ? parseInt(process.env.LOG_SERVER_PORT) : 3500;
        port = isNaN(port) ? 3500 : port;

        this.io?.listen(port);
        logInfo("The log server is running at port", port);
    }
}
