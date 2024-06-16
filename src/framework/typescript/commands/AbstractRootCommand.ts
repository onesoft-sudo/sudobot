import { Command } from "@framework/commands/Command";

abstract class AbstractRootCommand extends Command {
    public override execute(): Promise<void> {
        return Promise.resolve();
    }
}

export default AbstractRootCommand;
