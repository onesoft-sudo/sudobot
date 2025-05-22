import { generateEmbed, guildInfo, userInfo } from "@/utils/embed";
import { faker } from "@faker-js/faker";
import {
    ChatInputCommandInteraction,
    ColorResolvable,
    Colors,
    EmbedBuilder,
    User
} from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createClient } from "../mocks/client.mock";
import { createGuild, createInvite } from "../mocks/guild.mock";
import { randomSnowflake } from "../mocks/snowflakes";

describe("generateEmbed", () => {
    let authorIconURL: string;
    let footerIconURL: string;
    let thumbnailURL: string;
    let imageURL: string;
    let videoURL: string;
    let timestamp: Date;

    let options: ChatInputCommandInteraction["options"];

    beforeEach(() => {
        authorIconURL = faker.image.avatar();
        footerIconURL = faker.image.avatar();
        thumbnailURL = faker.image.avatar();
        imageURL = faker.image.avatar();
        videoURL = faker.internet.url() + "1.mp4";
        timestamp = new Date();

        options = {
            getString: (field: string) => {
                switch (field) {
                    case "author_name":
                        return "author";
                    case "author_icon_url":
                        return authorIconURL;
                    case "footer_text":
                        return "footer";
                    case "footer_icon_url":
                        return footerIconURL;
                    case "color":
                        return Colors.Red satisfies ColorResolvable;
                    case "title":
                        return "title";
                    case "description":
                        return "description";
                    case "thumbnail":
                        return thumbnailURL;
                    case "image":
                        return imageURL;
                    case "video":
                        return videoURL;
                    case "timestamp":
                        return timestamp.toISOString();
                    case "fields":
                        return "name: value";
                    default:
                        return undefined;
                }
            }
        } as ChatInputCommandInteraction["options"];
    });

    it("should generate an embed", () => {
        const embed = generateEmbed(options);

        expect(embed).toEqual({
            embed: new EmbedBuilder({
                video: {
                    url: videoURL
                }
            })
                .setAuthor({
                    name: "author",
                    iconURL: authorIconURL
                })
                .setTitle("title")
                .setDescription("description")
                .setThumbnail(thumbnailURL)
                .setImage(imageURL)

                .setFooter({
                    text: "footer",
                    iconURL: footerIconURL
                })
                .setTimestamp(timestamp)
                .addFields({
                    name: "name",
                    value: "value"
                })
                .setColor(Colors.Red)
        });
    });

    it("should return an error if the color is invalid", () => {
        const original = options.getString;

        options.getString = ((field: string) => {
            if (field === "color") {
                return "invalid";
            }

            return original(field);
        }) as typeof options.getString;

        const embed = generateEmbed(options);

        expect(embed).toEqual({
            error: "Invalid color given."
        });
    });

    it("should set the timestamp to the current date if the timestamp is 'current'", () => {
        const original = options.getString;

        options.getString = ((field: string) => {
            if (field === "timestamp") {
                return "current";
            }

            return original(field);
        }) as typeof options.getString;

        const startTime = Date.now();
        const embed = generateEmbed(options);
        const endTime = Date.now();

        expect(
            new Date(embed.embed?.toJSON().timestamp ?? "").getTime()
        ).greaterThanOrEqual(startTime);
        expect(
            new Date(embed.embed?.toJSON().timestamp ?? "").getTime()
        ).lessThanOrEqual(endTime);
    });
});

describe("userInfo", () => {
    it("should return the user info", () => {
        const id = randomSnowflake();
        const user = {
            id,
            username: faker.internet.username(),
            client: createClient(),
            toString() {
                return `<@${id}>`;
            }
        } as unknown as User;

        const info = userInfo(user);
        expect(info).toBe(
            `ID: ${user.id}\nUsername: ${user.username}\nMention: ${user.toString()}`
        );
    });

    it("should return the system user info if the user is the bot", () => {
        const user = createClient().user;

        const info1 = userInfo(user, true);
        const info2 = userInfo(user, false);

        expect(info1).toBe("System");
        expect(info2).toBe(`Type: __System__\nMention: ${user.toString()}`);
    });
});

describe("guildInfo", () => {
    it("should return the guild info", () => {
        const guild = createGuild();
        const invite = createInvite();

        guild.id = "123456789";
        guild.name = "Test Guild";
        guild.invites.cache.set("inviteCode", invite);

        const info = guildInfo(guild);

        expect(info).toBe(
            `ID: 123456789\nName: Test Guild\nInvite: ${invite.url}`
        );
    });

    it("should return 'Unavailable' if the guild invite is not available", () => {
        const guild = createGuild();

        guild.id = "987654321";
        guild.name = "Another Guild";

        const info = guildInfo(guild);

        expect(info).toBe(
            "ID: 987654321\nName: Another Guild\nInvite: *Unavailable*"
        );
    });
});
