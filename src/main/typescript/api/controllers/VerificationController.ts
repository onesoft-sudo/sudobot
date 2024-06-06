import { Action } from "@framework/api/decorators/Action";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import Response from "@framework/api/http/Response";

class VerificationController extends Controller {
    @Action("GET", "/verify")
    public async verify(request: Request) {
        if (!request.query.code) {
            return new Response({ status: 400, body: { error: "A code to verify is required." } });
        }

        const result = await this.application
            .service("verificationService")
            .verifyByCode(
                typeof request.query.code === "string"
                    ? request.query.code
                    : String(request.query.code)
            );

        if (!result) {
            return new Response({ status: 403, body: { error: "Invalid code." } });
        }

        return new Response({
            status: 302,
            headers: {
                Location: `https://discord.com/channels/${encodeURIComponent(result.guildId)}`
            }
        });
    }
}

export default VerificationController;
