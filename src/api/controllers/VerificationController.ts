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

import axios from "axios";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { Validate } from "../../decorators/Validate";
import { zSnowflake } from "../../types/SnowflakeSchema";
import { logError } from "../../utils/logger";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class VerificationController extends Controller {
    @Action("POST", "/challenge/verify")
    @Validate(
        z.object({
            responseToken: z.string(),
            verificationToken: z.string(),
            userId: zSnowflake
        })
    )
    async verify(request: Request) {
        const { responseToken, verificationToken, userId } = request.parsedBody;

        try {
            const response = await axios.post(
                "https://www.google.com/recaptcha/api/siteverify",
                new URLSearchParams({
                    secret: process.env.RECAPTCHA_SITE_SECRET!,
                    response: responseToken
                }).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            );

            if (!response.data.success) {
                throw new Error();
            }
        } catch (error) {
            logError(error);

            return new Response({
                status: 401,
                body: {
                    success: false,
                    error: "We were unable to verify you."
                }
            });
        }

        const result = await this.client.verification.attemptToVerifyUserByToken(userId, verificationToken);

        if (!result) {
            return new Response({
                status: 401,
                body: {
                    success: false,
                    error: "We were unable to verify you."
                }
            });
        }

        return {
            success: true
        };
    }
}
