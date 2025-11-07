import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { SnowflakeSchema } from "./SnowflakeSchema";

export const SystemConfigurationSchema = Type.Object({
    system_admins: Type.Array(SnowflakeSchema, { default: [] }),
    emoji_resolve_strategy: Type.Enum(["application", "home_guild", "both"], { default: "both" }),
    restart_exit_code: Type.Integer({ default: 0, minimum: 0, maximum: 255 }),
    presence: Type.Optional(
        Type.Object({
            type: Type.Enum(["Playing", "Streaming", "Listening", "Watching", "Competing", "Custom"], {
                default: "Watching"
            }),
            name: Type.String(),
            url: Type.Optional(
                Type.String({
                    format: "url"
                })
            ),
            status: Type.Enum(["online", "idle", "dnd", "invisible"], { default: "dnd" })
        })
    )
});

export const SystemConfigurationSchemaValidator = Compile(SystemConfigurationSchema);
export type SystemConfigurationType = Type.Static<typeof SystemConfigurationSchema>;

export const SystemConfigurationDefaultValue = SystemConfigurationSchemaValidator.Parse({});
