import axios from "axios";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { Validate } from "../../decorators/Validate";
import { logError } from "../../utils/logger";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

const verifySchema = z.object({
    responseToken: z.string()
});

export default class VerificationController extends Controller {
    @Action("POST", "/challenge/verify")
    @Validate(verifySchema)
    async verify(request: Request) {
        const { responseToken } = request.parsedBody;

        console.log(request.parsedBody);

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

            console.log(response.data);

            if (response.data.success) {
                return {
                    success: true
                };
            } else {
                return new Response({
                    status: 401,
                    body: {
                        success: false,
                        error: "We were unable to verify you."
                    }
                });
            }
        } catch (error) {
            logError(error);
        }
    }
}
