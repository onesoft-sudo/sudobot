/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { AnyConstructor } from "@framework/container/Container";
import Container from "@framework/container/Container";
import Kernel from "@framework/core/Kernel";
import { Logger } from "@framework/log/Logger";
import { createAxiosClient } from "@main/utils/axios";
import metadata from "@root/package.json";
import { spawn } from "child_process";
import { GatewayIntentBits, Partials } from "discord.js";
import path from "path";
import Client from "./Client";

type Binding = {
    key: string;
    value: object;
};

export type MetadataType = typeof metadata;

class DiscordKernel extends Kernel {
    protected readonly intents = (process.env.DISCORD_INTENTS?.split(":")?.map(intent => {
        if (!(intent in GatewayIntentBits)) {
            throw new Error(`Invalid intent in DISCORD_INTENTS: ${intent}`);
        }

        return GatewayIntentBits[intent as keyof typeof GatewayIntentBits];
    }) as GatewayIntentBits[] | undefined) || [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ];
    protected readonly partials = [Partials.Channel];
    public static readonly aliases = {
        automod: path.resolve(__dirname, "../automod"),
        services: path.resolve(__dirname, "../services"),
        root: path.resolve(__dirname, "../../..")
    };
    public static readonly services = [
        "@services/StartupManager",
        "@services/DatabaseService",
        "@services/ConfigurationManager" /* This service is manually booted by the Extension Service. */,
        "@services/ExtensionManager",
        "@services/LogStreamingService",
        "@services/CommandManager",
        "@services/PermissionManagerService",
        "@services/ExtensionPostBootManager",
        "@services/QueueService",
        "@services/AuditLoggingService",
        "@services/SystemAuditLoggingService",
        "@services/InfractionManager",
        "@services/ImageRecognitionService",
        "@services/InviteTrackingService",
        "@automod/AntiMemberJoinService",
        "@services/ModerationActionService",
        "@automod/SpamModerationService",
        "@automod/RuleModerationService",
        "@automod/RaidProtectionService",
        "@services/DirectiveParsingService",
        "@automod/VerificationService",
        "@automod/AIAutoModeration",
        "@services/QuickMuteService",
        "@services/ChannelLockManager",
        "@services/ReactionRoleService",
        "@services/AFKService",
        "@services/AutoRoleService",
        "@automod/TriggerService",
        "@services/MessageReportingService",
        "@services/WelcomerService",
        "@services/BumpReminderService",
        "@services/SurveyService",
        "@services/ShellService",
        "@services/AuthService",
        "@services/WizardManagerService",
        "@services/GuildSetupService",
        "@services/SnippetManagerService",
        "@services/TranslationService",
        "@services/InterProcessCommunicationService",
        "@services/SystemUpdateService",
        "@automod/NewMemberMessageInspectionService",
        "@root/framework/typescript/api/APIServer"
    ];

    public constructor() {
        super();
        global.kernel = this;
        this.bindSelf();
    }

    protected bindings(): Binding[] {
        const application = this.getApplication();

        return [
            { key: "application", value: application },
            { key: "client", value: application.getClient() },
            { key: "logger", value: application.logger },
            { key: "serviceManager", value: application.serviceManager },
            { key: "dynamicLoader", value: application.classLoader }
        ];
    }

    protected bindSelf() {
        Container.getInstance().bind(DiscordKernel, {
            factory: () => this,
            singleton: true,
            key: "kernel"
        });

        Container.getInstance().bind(Kernel, {
            factory: () => this,
            singleton: true
        });
    }

    protected createClient(logger: Logger) {
        return new Client(
            {
                intents: this.intents,
                partials: this.partials
            },
            logger
        );
    }

    protected createLogger() {
        const logger = new Logger("system", true);

        logger.on("log", message => {
            const logServerEnabled = this.getApplication()?.service("configManager", false)?.systemConfig?.log_server
                ?.enabled;

            if (logServerEnabled) {
                this.getApplication().service("logStreamingService", false)?.log(message);
            }
        });

        return logger;
    }

    public setup() {
        const application = this.getApplication();

        const logger = this.createLogger();
        const client = this.createClient(logger);

        application.setLogger(logger);
        application.setClient(client);
        application.setMetadata(metadata);

        this.bindSelf();

        for (const binding of this.bindings()) {
            application.container.bind(binding.value.constructor as AnyConstructor, {
                factory: () => binding.value,
                singleton: true,
                key: binding.key
            });
        }

        createAxiosClient(application);
    }

    public getClient() {
        return Container.getInstance().resolveByClass(Client);
    }

    public override async boot() {
        this.logger.debug("Starting the kernel...");
        this.setup();

        this.spawnNativeProcess();

        this.logger.debug("Booting up the application...");

        const application = this.getApplication();
        await application.boot();

        if (process.env.SERVER_ONLY_MODE) {
            await application.service("apiServer").boot();
            application.service("apiServer").start();
        } else {
            this.logger.debug("Attempting to log into Discord...");
            await application.getClient().login(process.env.TOKEN);
            this.logger.debug("Logged into Discord");
        }
    }

    protected spawnNativeProcess() {
        const path = process.env.EXPERIMENTAL_NATIVE_EXECUTABLE_PATH;

        if (path) {
            this.logger.debug("Spawning native process...");

            const child = spawn(path, {
                stdio: "inherit",
                env: process.env
            });

            process.on("exit", () => void (child.killed ? null : child.kill()));
            process.on("uncaughtException", () => void (child.killed ? null : child.kill()));
            process.on("unhandledRejection", () => void (child.killed ? null : child.kill()));
        }
    }

    protected abort() {
        this.logger.fatal("Kernel boot aborted");
        process.exit(-1);
    }
}

export default DiscordKernel;
