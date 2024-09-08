import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { formatSize } from "@framework/utils/formatters";
import { Colors } from "@main/constants/Colors";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { formatDistanceToNow } from "date-fns";
import type { APIEmbedField, Message } from "discord.js";
import os from "os";

class SystemStatusCommand extends Command {
    public override readonly name = "system";
    public override readonly description: string = "Displays the system status.";
    public override readonly usage = [""];
    public override readonly systemPermissions = [];
    public override readonly aliases = ["ping"];

    @Inject()
    private readonly permissionManagerService!: PermissionManagerService;

    public override build(): Buildable[] {
        return [this.buildChatInput()];
    }

    public override async execute(context: Context): Promise<void> {
        let message: Message | undefined;

        const startTime = Date.now();

        if (context.isLegacy()) {
            message = await context.reply({
                embeds: [
                    {
                        description: `${context.emoji("loading") || ""} Checking system status...`,
                        color: Colors.Primary
                    }
                ]
            });
        } else {
            await context.defer();
        }

        const latency = Date.now() - startTime;
        const ping = this.application.client.ws.ping;
        const maxLatency = Math.max(latency, ping);
        const status =
            maxLatency >= 1000 ? "outage" : maxLatency >= 500 ? "degraded" : "operational";
        const color =
            status === "operational"
                ? Colors.Success
                : status === "degraded"
                  ? Colors.Yellow
                  : Colors.Red;

        const memoryUsage = process.memoryUsage();
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();

        const fields: APIEmbedField[] = [
            {
                name: "Latency",
                value: ping < 0 ? "N/A" : `${ping}ms`,
                inline: true
            },
            {
                name: "System Latency",
                value: latency < 0 ? "N/A" : `${latency}ms`,
                inline: true
            }
        ];

        if (context.member && (await this.permissionManagerService.isSystemAdmin(context.member))) {
            fields.push(
                {
                    name: "Host System Memory Usage",
                    value: `${formatSize(totalMemory - freeMemory)} / ${formatSize(totalMemory)}`
                },
                {
                    name: "Runtime Memory Usage",
                    value: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
                },
                {
                    name: "Uptime",
                    value: `${formatDistanceToNow(Date.now() + process.uptime() * 1000)}`
                },
                {
                    name: "Runtime",
                    value: process.isBun
                        ? `**Bun** v${process.versions.bun}`
                        : `**Node.js** v${process.versions.node} ${process.release.lts ? "LTS" : ""}`
                },
                {
                    name: "Operating System",
                    value: `**${os.type()}** ${os.release()} ${os.machine()}`
                },
                {
                    name: "CPU",
                    value: `**${os.cpus().length}x** ${os.cpus()[0].model}`
                }
            );
        }

        const embed = {
            description: `## ${context.emoji("sudobot") || ""} System Status\n${
                status === "degraded"
                    ? "⚠️"
                    : context.emoji(status === "operational" ? "check" : "error") || ""
            } ${
                status === "operational"
                    ? "All systems are operational"
                    : status === "degraded"
                      ? "Degraded performance"
                      : "Major outage"
            }`,
            fields,
            color
        };

        if (context.isLegacy() && message) {
            message.edit({ embeds: [embed] });
        } else if (context.isChatInput()) {
            context.replyEmbed(embed);
        }
    }
}

export default SystemStatusCommand;
