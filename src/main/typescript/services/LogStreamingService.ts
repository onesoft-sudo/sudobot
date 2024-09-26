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

import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import bcrypt from "bcrypt";
import chalk from "chalk";
import { Server, Socket } from "socket.io";
import ConfigurationManager from "./ConfigurationManager";

@Name("logStreamingService")
export default class LogStreamingService extends Service {
    public readonly MAX_CONNECTIONS = 5;
    protected connections = 0;
    private _io?: Server;
    public readonly sockets: Array<Socket> = [];

    public override boot() {
        if (
            !this.application.getService(ConfigurationManager).systemConfig.log_server?.auto_start
        ) {
            return;
        }

        this.initialize();
    }

    private get io() {
        return this._io;
    }

    private initialize() {
        this._io = new Server();
        this.setupListeners();
    }

    public start() {
        this.initialize();
        this.listen();
    }

    public close() {
        const promise = this.io?.close();

        if (promise && (promise as unknown as Promise<void>) instanceof Promise) {
            promise.catch(this.application.logger.error);
        }

        this._io = undefined;
    }

    private isAuthorized(socket: Socket) {
        const { authorization } = socket.request.headers;
        const [type, password] = authorization?.split(/\s+/) ?? ["", ""];

        if (type !== "Bearer") {
            socket.send("[error] Only bearer tokens are supported!");
            socket.disconnect(true);
            return false;
        }

        if (
            !bcrypt.compareSync(
                password,
                process.env.LOG_SERVER_PASSWORD ?? Math.random().toString()
            )
        ) {
            socket.send("[error] Authentication failed");
            socket.disconnect(true);
            return false;
        }

        return true;
    }

    private setupListeners() {
        this.io?.on("connection", socket => {
            if (this.connections >= this.MAX_CONNECTIONS) {
                socket.disconnect();
                return;
            }

            this.connections++;
            this.application.logger.info("New client connected to the log server", socket.id);

            socket.on("disconnect", reason => {
                this.connections--;
                this.application.logger.info(
                    "Client Disconnected from log server: ",
                    socket.id,
                    reason
                );
                const index = this.sockets.findIndex(s => s.id === socket.id);

                if (index !== -1) {
                    this.sockets.splice(index, 1);
                }
            });

            if (!this.isAuthorized(socket)) {
                this.application.logger.warn(
                    "Unauthorized client attempted to connect to the log server",
                    socket.id
                );
                return;
            }

            socket.write(`${chalk.cyan("[info]")} Connection Accepted`);

            this.sockets.push(socket);
        });
    }

    public send(message: string) {
        for (const socket of this.sockets) {
            socket.send(message);
        }
    }

    public log(message: string) {
        this.sockets.forEach(socket => {
            socket.send(`${message}`);
        });
    }

    public listen() {
        let port = process.env.LOG_SERVER_PORT ? parseInt(process.env.LOG_SERVER_PORT) : 3500;
        port = isNaN(port) ? 3500 : port;

        this.io?.listen(port);
        this.application.logger.info("The log server is running at port", port);
    }
}
