import { Message } from "discord.js";
import { vi } from "vitest";
import { createManager } from "./manager.mock";

export function createMessage(content: string, userId: string, guildId: string) {
    const mocks = {
        reply: vi.fn(() => Promise.resolve())
    };

    const message = {
        content,
        author: {
            id: userId
        },
        memberId: userId,
        member: {
            id: userId,
            user: {
                id: userId
            }
        },
        reply: mocks.reply,
        guildId,
        guild: {
            id: guildId,
            members: createManager()
        }
    } as unknown as Message;

    Object.setPrototypeOf(message, Message.prototype);
    return [message, mocks] as const;
}
