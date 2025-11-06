import { Type } from "typebox";
import { Compile } from "typebox/compile";

export const GuildConfigurationSchema = Type.Object({
    commands: Type.Optional(
        Type.Object({
            prefix: Type.String({ default: "-", pattern: /^[^\s]+$/, minLength: 1 })
        })
    )
});

export const GuildConfigurationSchemaValidator = Compile(GuildConfigurationSchema);
export type GuildConfigurationType = Type.Static<typeof GuildConfigurationSchema>;

export const GuildConfigurationDefaultValue = GuildConfigurationSchemaValidator.Parse({});
