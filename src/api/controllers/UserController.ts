
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

import { Request } from "express";
import User from "../../models/User";
import Controller from "../Controller";
import { body } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import KeyValuePair from "../../types/KeyValuePair";
import Response from "../Response";
import ValidatorError from "../middleware/ValidatorError";
import RequireAuth from "../middleware/RequireAuth";

export default class UserController extends Controller {
    middleware(): KeyValuePair<Function[]> {
        return {
            create: [
                body(["password"]).isLength({ min: 2 }), 
                body(["username"]).custom(async username => {
                    const user = await User.findOne({ username });

                    if (user) {
                        return Promise.reject("Username is already in use");
                    }

                    return username;
                }),
                body(["discord_id"]).custom(value => /\d+/g.test(value) ? value : Promise.reject("Invalid Snowflake Given"))
            ],
            login: [
                body(["username", "password"]).isLength({ min: 2 }),
            ],
            delete: [
                RequireAuth,
                body(["username", "password"]).isLength({ min: 2 }),
            ]
        };
    }

    globalMiddleware(): Function[] {
        return [ValidatorError];
    }

    public async index() {
        return new Response(403);
        return await User.find().select(["_id", "username", "createdAt"]).limit(30);
    }

    public async create(request: Request) {
        return new Response(403);

        const user = new User();

        user.username = request.body.username;
        user.discord_id = request.body.discord_id;
        user.createdAt = new Date();
        user.tokenUpdatedAt = new Date();

        try {
            await user.save();
        }
        catch (e) {
            return { error: "DB validation error", error_type: 'db_validation' };
        }

        const salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(request.body.password, salt);

        const token = await jwt.sign({
            username: user.username,
            discord_id: user.discord_id,
            _id: user.id
        }, process.env.JWT_SECRET!, {
            expiresIn: "2 days",
            issuer: "SudoBot API",
        });

        user.token = token;
        
        try {
            await user.save();
        }
        catch (e) {
            return { error: "Token signing error", error_type: 'token_signing' };
        }

        user.password = undefined;
        return user;
    }

    public async delete(request: Request) {
        const { username, password } = request.body;
        const user = await User.findOne({ username });

        if (!user) {
            return { error: "Username is incorrect." };
        }

        if (!(await bcrypt.compare(password, user.password!))) {
            return { error: "Password is incorrect." };
        }

        await user.delete();

        user.password = undefined;
        user.token = undefined;
        user.tokenUpdatedAt = undefined;

        return {
            message: "Account deletion successful",
            user
        };
    }

    public async login(request: Request) {
        const { username, password } = request.body;
        const user = await User.findOne({ username });

        if (!user) {
            return { error: "Username is incorrect." };
        }

        if (!(await bcrypt.compare(password, user.password!))) {
            return { error: "Password is incorrect." };
        }

        let { token } = user;

        try {
            if (!token) {
                throw new Error("Token is not set");
            }

            if (!jwt.verify(token, process.env.JWT_SECRET!)) {
                throw new Error("Token is not valid");
            }
        }
        catch (e) {
            console.log(e);    
            
            const newToken = await jwt.sign({
                username: user.username,
                discord_id: user.discord_id,
                _id: user.id
            }, process.env.JWT_SECRET!, {
                expiresIn: "2 days",
                issuer: "SudoBot API",
            });    

            token = newToken;
            user.tokenUpdatedAt = new Date();
            user.token = newToken;
            await user.save();
        }

        return {
            message: "Login successful",
            username,
            token,
            expires: new Date(user.tokenUpdatedAt!.getTime() + (2 * 24 * 60 * 60 * 1000)),
            guilds: this.client.guilds.cache.filter(g => user.guilds.includes(g.id) ?? false)
        };
    }
}