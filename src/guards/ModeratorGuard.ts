import { AnyCommand } from "../framework/commands/Command";
import { AnyContext } from "../framework/commands/Context";
import { Guard } from "../framework/guards/Guard";

class ModeratorGuard extends Guard {
    public override async check(command: AnyCommand, context: AnyContext): Promise<boolean> {
        return command.beta && context.userId === "1234567890";
    }
}

export default ModeratorGuard;
