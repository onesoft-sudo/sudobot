import LegacyContext from "@framework/commands/LegacyContext";
import { Message } from "discord.js";
import { createMessage } from "../../mocks/message.mock";

export const initialize = ({
    content,
    userId,
    guildId,
    prefix
}: {
    content: string;
    userId: string;
    guildId: string;
    prefix: string;
}) => {
    const [message] = createMessage(`${prefix}${content}`, userId, guildId) as readonly [
        Message<true>,
        unknown
    ];
    const argv = content.split(" ");
    const args = argv.slice(1);
    const context = new LegacyContext(
        argv[0],
        message.content.slice(prefix.length),
        message,
        args,
        argv
    );

    return {
        message,
        argv,
        args,
        context,
        content
    };
};
