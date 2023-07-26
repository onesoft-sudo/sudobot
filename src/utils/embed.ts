import { ColorResolvable, EmbedBuilder, resolveColor } from "discord.js";
import { ChatInputCommandContext } from "../services/CommandManager";

export function generateEmbed(options: ChatInputCommandContext["options"]) {
    const getString = (field: string): string | undefined => {
        return options.getString(field) ?? undefined;
    };

    const author = {
        name: getString("author_name")!,
        iconURL: getString("author_iconurl")
    };

    const footer = {
        text: getString("footer_text")!,
        iconURL: getString("footer_iconurl")
    };

    if (getString("color") && (!resolveColor(getString("color") as ColorResolvable) || isNaN(resolveColor(getString("color") as ColorResolvable)))) {
        return { error: "Invalid color given." };
    }

    const embed = new EmbedBuilder({
        author: author.name ? author : undefined,
        title: getString("title"),
        description: getString("description"),
        thumbnail: getString("thumbnail")
            ? {
                  url: getString("thumbnail")!
              }
            : undefined,
        image: getString("image")
            ? {
                  url: getString("image")!
              }
            : undefined,
        video: getString("video")
            ? {
                  url: getString("video")!
              }
            : undefined,
        footer: footer.text ? footer : undefined,
        timestamp: getString("timestamp") ? (getString("timestamp") === "current" ? new Date() : new Date(getString("timestamp")!)) : undefined,
        fields: getString("fields")
            ? getString("fields")!
                  .trim()
                  .split(",")
                  .map(fieldData => {
                      const [name, value] = fieldData.trim().split(":");

                      return {
                          name: name.trim(),
                          value: value.trim()
                      };
                  })
            : [],
        url: getString("url")
    }).setColor((getString("color") ?? "#007bff") as ColorResolvable);

    return { embed };
}
