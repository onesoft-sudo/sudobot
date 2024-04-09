import { Collection } from "discord.js";
import { vi } from "vitest";

export const createManager = () => {
    return {
        fetch: vi.fn(() => Promise.resolve()),
        cache: new Collection()
    };
};
