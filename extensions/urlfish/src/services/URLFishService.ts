import Service from "@sudobot/core/Service";
import FileSystem from "@sudobot/polyfills/FileSystem";
import { downloadFile } from "@sudobot/utils/download";
import { channelInfo, userInfo } from "@sudobot/utils/embed";
import { safeChannelFetch } from "@sudobot/utils/fetch";
import { sudoPrefix } from "@sudobot/utils/utils";
import { Colors, Message } from "discord.js";
import { ActionToTake, Config, GuildConfigWithExtension } from "src/types/config";

export const name = "urlfish";

export default class URLFishService extends Service {
    private readonly domainListURL =
        "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt";
    private _list: string[] = [];

    async boot() {
        const urlfishDir = sudoPrefix("tmp/urlfish", true);
        const dataFile = sudoPrefix("tmp/urlfish/LIST", false);

        if (await FileSystem.exists(dataFile)) {
            this.client.logger.debug("URLFishService", "Phishing domain list already exists", dataFile);
        } else {
            this.client.logger.debug("URLFishService", "Phishing domain list not found", dataFile);
            this.client.logger.debug("URLFishService", "Downloading list", dataFile);

            const url = this.domainListURL;
            await downloadFile({
                url,
                name: "LIST",
                path: urlfishDir
            });
        }

        const data = (await FileSystem.readFileContents<string>(dataFile)).split("\n");
        this.client.logger.debug("URLFishService", `Loaded ${data.length} entries from file`);
        this._list = data;
    }

    get list() {
        return this._list;
    }

    scanMessage(message: Message) {
        const urls = message.content.toLowerCase().split(" ");
        const phishingURLs: string[] = [];

        for (const url of urls) {
            const domain = url.startsWith("http") ? url.replace(/https?:\/?\/?/i, "") : url;

            if (this.list.includes(domain)) {
                phishingURLs.push(url);
            }
        }

        return phishingURLs;
    }

    async verifyMessage(message: Message) {
        const config = this.client.configManager.get<GuildConfigWithExtension>(message.guildId!)?.urlfish;

        if (
            !config?.enabled ||
            (config.channels && "enabled_in" in config.channels && !config.channels.enabled_in.includes(message.channelId)) ||
            (config.channels && "disabled_in" in config.channels && config.channels.disabled_in.includes(message.channelId)) ||
            (await this.client.permissionManager.isImmuneToAutoMod(message.member!))
        ) {
            return;
        }

        const links = this.scanMessage(message);

        if (links.length > 0) {
            await this.takeAction(message, config);
            await this.logMessage(message, config, links, config.action);
        }
    }

    async takeAction(message: Message<boolean>, config: NonNullable<Config>) {
        switch (config.action) {
            case "delete":
                if (message.deletable) {
                    await message.delete();
                }

                break;
            case "warn":
                await this.client.infractionManager.createMemberWarn(message.member!, {
                    guild: message.guild!,
                    reason:
                        config.infraction_reason ??
                        "We have detected phishing URLs in your message. Please refrain from posting these links.",
                    moderator: this.client.user!,
                    notifyUser: true,
                    sendLog: true
                });

                break;
            case "mute":
                await this.client.infractionManager.createMemberMute(message.member!, {
                    guild: message.guild!,
                    reason:
                        config.infraction_reason ??
                        "We have detected phishing URLs in your message. Please refrain from posting these links.",
                    moderator: this.client.user!,
                    notifyUser: true,
                    sendLog: true,
                    duration: config.mute_duration ?? 3_600_000, // 1 hour,
                    autoRemoveQueue: true
                });

                break;
            case "kick":
                await this.client.infractionManager.createMemberKick(message.member!, {
                    guild: message.guild!,
                    reason: config.infraction_reason ?? "We have detected phishing URLs in your message.",
                    moderator: this.client.user!,
                    notifyUser: true,
                    sendLog: true
                });

                break;
            case "ban":
                await this.client.infractionManager.createUserBan(message.author, {
                    guild: message.guild!,
                    reason: config.infraction_reason ?? "We have detected phishing URLs in your message.",
                    moderator: this.client.user!,
                    notifyUser: true,
                    sendLog: true,
                    deleteMessageSeconds: 604_800, // 7 days,
                    autoRemoveQueue: true
                });

                break;
        }
    }

    async logMessage(message: Message<boolean>, config: Config, links: string[], action: ActionToTake) {
        if (!config?.log_channel || !message.guild) {
            return;
        }

        const logChannel = await safeChannelFetch(message.guild, config?.log_channel);

        if (!logChannel?.isTextBased()) {
            return;
        }

        const joinedLinks = links.join("\n");

        await logChannel.send({
            embeds: [
                {
                    title: `Phishing URLs detected in ${message.url}`,
                    fields: [
                        {
                            name: "URLs",
                            value: joinedLinks.substring(0, 1020) + (joinedLinks.length > 1020 ? "..." : "")
                        },
                        {
                            name: "Channel",
                            value: channelInfo(message.channel),
                            inline: true
                        },
                        {
                            name: "User",
                            value: userInfo(message.author),
                            inline: true
                        },
                        {
                            name: "Action",
                            value:
                                action === "ban"
                                    ? "Banned"
                                    : action[0].toUpperCase() + action.substring(1) + (action.endsWith("e") ? "d" : "ed"),
                            inline: true
                        }
                    ],
                    description: message.content || "*No content*",
                    color: Colors.Red,
                    timestamp: message.createdAt.toISOString(),
                    author: {
                        name: message.author.username,
                        icon_url: message.author.displayAvatarURL()
                    },
                    footer: {
                        text: `Detected by URLFish`
                    }
                }
            ]
        });
    }
}
