import "module-alias/register";

import Application from "@framework/app/Application";
import { Command } from "@framework/commands/Command";
import { Class } from "@framework/types/Utils";
import { Extension } from "@sudobot/extensions/Extension";
import { Awaitable } from "discord.js";
import { ZodType } from "zod";
import CountCommand from "./commands/CountCommand";
import { countingEntries } from "./models/CountingEntry";
import { CountingConfigSchema } from "./schemas/CountingConfigSchema";
import EventListener from "@framework/events/EventListener";
import MessageCreateEventListener from "./events/message/MessageCreateEventListener";
import { Service } from "@framework/services/Service";
import CountingService from "./services/CountingService";

class CountingExtension extends Extension {
    protected commands(): Awaitable<Class<Command, [Application]>[]> {
        return [CountCommand];
    }

    protected events(): Awaitable<Class<EventListener, [Application]>[]> {
        return [MessageCreateEventListener];
    }

    protected services(): Awaitable<Class<Service, [Application]>[]> {
        return [CountingService];
    }

    public guildConfig(): Awaitable<{ [K in PropertyKey]: ZodType<unknown> } | null> {
        return {
            counting: CountingConfigSchema.optional()
        };
    }

    public databaseModels() {
        return { countingEntries };
    }
}

export default CountingExtension;
