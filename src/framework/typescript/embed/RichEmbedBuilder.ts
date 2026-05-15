import type { APIContainerComponent } from "discord.js";
import {
    ContainerBuilder,
    escapeMarkdown,
    heading,
    HeadingLevel,
    SectionBuilder,
    TextDisplayBuilder,
    time
} from "discord.js";

class RichEmbedBuilder extends ContainerBuilder {
    private readonly fields: RichEmbedField[] = [];
    private footerText: string | null = null;
    private timestamp: Date | null = null;
    private topSectionTitle: string | null = null;
    private topSectionAuthorName: string | null = null;
    private topSectionAuthorURL: string | null = null;
    private topSectionURL: string | null = null;
    private topSectionIconURL: string | null = null;
    private topSectionIconDescription: string | null = null;
    private topSectionIconSpoiler: boolean = false;
    private textContents = "";

    public clearFields() {
        this.fields.length = 0;
        return this;
    }

    public getFields(): ReadonlyArray<RichEmbedField> {
        return this.fields;
    }

    public addFields(...fields: RichEmbedField[]) {
        this.fields.push(...fields);
        return this;
    }

    public addField(field: RichEmbedField) {
        this.fields.push(field);
        return this;
    }

    public setFooterText(text: string | null) {
        this.footerText = text;
        return this;
    }

    public addTextContent(text: string) {
        this.textContents += text;
        return this;
    }

    public setTimestamp(timestamp: Date | number | null = new Date()) {
        if (typeof timestamp === "number") {
            timestamp = new Date(timestamp);
        }

        this.timestamp = timestamp;
        return this;
    }

    public setTitle(title: string | null) {
        this.topSectionTitle = title;
        return this;
    }

    public setURL(url: string | null) {
        this.topSectionURL = url;
        return this;
    }

    public setAuthorName(authorName: string | null) {
        this.topSectionAuthorName = authorName;
        return this;
    }

    public setAuthorURL(url: string | null) {
        this.topSectionAuthorURL = url;
        return this;
    }

    public setIconURL(iconURL: string | null) {
        this.topSectionIconURL = iconURL;
        return this;
    }

    public setIconDescription(description: string | null) {
        this.topSectionIconDescription = description;
        return this;
    }

    public setIconSpoiler(spoiler: boolean) {
        this.topSectionIconSpoiler = spoiler;
        return this;
    }

    private convertFieldsToString(): string {
        let str = "";

        for (const field of this.fields) {
            str += `${heading(field.name, HeadingLevel.Three)}\n`;
            str += `${field.escape ? escapeMarkdown(field.value) : field.value}\n\n`;
        }

        return str.trim();
    }

    public override toJSON(): APIContainerComponent {
        const fieldString = this.convertFieldsToString();
        const json = super.toJSON();
        const components = [];

        if (
            this.topSectionIconURL ||
            this.topSectionTitle ||
            this.topSectionURL
        ) {
            let text = "";

            if (this.topSectionTitle) {
                text = this.topSectionTitle;

                if (this.topSectionURL) {
                    text = `[${text}](${encodeURI(this.topSectionURL)})`;
                }

                text = `${heading(text, HeadingLevel.One)}`;
            }

            if (!text) {
                text = "_** **_";
            }

            if (this.topSectionAuthorName) {
                let authorText = this.topSectionAuthorName;

                if (this.topSectionAuthorURL) {
                    authorText = `[${authorText}](${encodeURI(this.topSectionAuthorURL)})`;
                }

                if (text) {
                    text += "\n";
                }

                authorText = `${heading(authorText, HeadingLevel.Two)}`;
                text += authorText;
            }

            const component = this.topSectionIconURL
                ? new SectionBuilder()
                      .addTextDisplayComponents(
                          new TextDisplayBuilder().setContent(text)
                      )
                      .setThumbnailAccessory(thumbnail => {
                          if (this.topSectionIconDescription) {
                              thumbnail.setDescription(
                                  this.topSectionIconDescription
                              );
                          }

                          if (this.topSectionIconSpoiler) {
                              thumbnail.setSpoiler(true);
                          }

                          return thumbnail.setURL(this.topSectionIconURL!);
                      })
                : new TextDisplayBuilder().setContent(text);

            components.push(component.toJSON());
        }

        if (this.textContents) {
            components.push(
                new TextDisplayBuilder().setContent(this.textContents).toJSON()
            );
        }

        components.push(...json.components);

        if (fieldString) {
            components.push(
                new TextDisplayBuilder().setContent(fieldString).toJSON()
            );
        }

        if (this.footerText || this.timestamp) {
            let text = "-# ";

            if (this.footerText) {
                text += this.footerText;
            }

            if (this.footerText && this.timestamp) {
                text += " • ";
            }

            if (this.timestamp) {
                text += time(this.timestamp, "f");
            }

            components.push(new TextDisplayBuilder().setContent(text).toJSON());
        }

        return {
            ...json,
            components
        };
    }
}

export type RichEmbedField = {
    name: string;
    value: string;
    escape?: boolean;
};

export default RichEmbedBuilder;
