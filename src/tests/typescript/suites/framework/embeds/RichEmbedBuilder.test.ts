import RichEmbedBuilder from "@framework/embed/RichEmbedBuilder";
import {
    Colors,
    ComponentType,
    heading,
    HeadingLevel,
    SectionBuilder,
    TextDisplayBuilder,
    time
} from "discord.js";
import { describe, expect, it } from "vitest";

describe("RichEmbedBuilder", () => {
    it("can build basic embeds", () => {
        const richEmbed = new RichEmbedBuilder()
            .setTitle("Test Title")
            .addTextContent("Some text here");

        const json = richEmbed.toJSON();

        expect(json.type).toBe(ComponentType.Container);
        expect(json.components).toEqual([
            new TextDisplayBuilder()
                .setContent(heading("Test Title", HeadingLevel.One))
                .toJSON(),
            new TextDisplayBuilder().setContent("Some text here").toJSON()
        ]);
    });

    it("can build complex embeds", () => {
        const date = new Date();
        const richEmbed = new RichEmbedBuilder()
            .setTitle("Test Title")
            .setURL("https://www.example.com")
            .addTextContent("Some text here")
            .setAuthorName("John Doe")
            .setAccentColor(Colors.Green)
            .setIconURL("https://picsum.photos/500/500")
            .setFooterText("Footer text")
            .setTimestamp(date);

        const json = richEmbed.toJSON();

        expect(json.accent_color).toBe(Colors.Green);
        expect(json.components).toEqual([
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        heading(
                            "[Test Title](https://www.example.com)",
                            HeadingLevel.One
                        ) +
                            "\n" +
                            heading("John Doe", HeadingLevel.Two)
                    )
                )
                .setThumbnailAccessory(builder =>
                    builder.setURL("https://picsum.photos/500/500")
                )
                .toJSON(),
            new TextDisplayBuilder().setContent("Some text here").toJSON(),
            new TextDisplayBuilder()
                .setContent(`-# Footer text • ${time(date, "f")}`)
                .toJSON()
        ]);
    });
});
