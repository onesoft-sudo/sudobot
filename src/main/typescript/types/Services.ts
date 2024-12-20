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

import type APIServer from "@framework/api/APIServer";
import type { ServiceManager } from "@framework/services/ServiceManager";
import type AntiMemberJoinService from "@main/automod/AntiMemberJoinService";
import type VerificationService from "@main/automod/VerificationService";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type DatabaseService from "@main/services/DatabaseService";
import type DirectiveParsingService from "@main/services/DirectiveParsingService";
import type GuildSetupService from "@main/services/GuildSetupService";
import type InviteTrackingService from "@main/services/InviteTrackingService";
import type ShellService from "@main/services/ShellService";
import type SystemAuditLoggingService from "@main/services/SystemAuditLoggingService";
import type WizardManagerService from "@main/services/WizardManagerService";
import type ChannelLockManager from "../services/ChannelLockManager";
import type CommandManager from "../services/CommandManager";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ExtensionManager from "../services/ExtensionManager";
import type ImageRecognitionService from "../services/ImageRecognitionService";
import type InfractionManager from "../services/InfractionManager";
import type LogStreamingService from "../services/LogStreamingService";
import type ModerationActionService from "../services/ModerationActionService";
import type PermissionManagerService from "../services/PermissionManagerService";
import type QueueService from "../services/QueueService";
import type SnippetManagerService from "../services/SnippetManagerService";
import type StartupManager from "../services/StartupManager";

export interface ServiceRecord {
    commandManager: CommandManager;
    configManager: ConfigurationManager;
    extensionManager: ExtensionManager;
    logStreamingService: LogStreamingService;
    apiServer: APIServer;
    startupManager: StartupManager;
    serviceManager: ServiceManager;
    permissionManager: PermissionManagerService;
    queueService: QueueService;
    infractionManager: InfractionManager;
    moderationActionService: ModerationActionService;
    imageRecognitionService: ImageRecognitionService;
    auditLoggingService: AuditLoggingService;
    directiveParsingService: DirectiveParsingService;
    systemAuditLogging: SystemAuditLoggingService;
    channelLockManager: ChannelLockManager;
    snippetManagerService: SnippetManagerService;
    antiMemberJoinService: AntiMemberJoinService;
    verificationService: VerificationService;
    inviteTrackingService: InviteTrackingService;
    databaseService: DatabaseService;
    shellService: ShellService;
    wizardManagerService: WizardManagerService;
    guildSetupService: GuildSetupService;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ServiceRecordLocal extends ServiceRecord {}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ServiceRecord extends ServiceRecordLocal {}
}
