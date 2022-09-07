import { Request } from "express";
import User from "../../models/User";
import Controller from "../Controller";
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import KeyValuePair from "../../types/KeyValuePair";
import { promise } from "zod";
import Response from "../Response";

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
            ]
        };
    }

    public async index() {
        return await User.find().limit(30);
    }

    public async create(request: Request) {
        return new Response(403);
        
        const errors = validationResult(request);

        if (!errors.isEmpty()) {
            return { errors: errors.array(), error_type: 'validation' };
        } 

        const user = new User();

        user.username = request.body.username;
        user.discord_id = request.body.discord_id;
        user.createdAt = new Date();

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
}