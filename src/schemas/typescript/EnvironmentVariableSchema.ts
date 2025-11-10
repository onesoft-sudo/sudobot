import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { SnowflakeSchema } from "./SnowflakeSchema";

export const EnvironmentVariableSchema = Type.Object({
    SUDOBOT_TOKEN: Type.String(),
    SUDOBOT_HOME_GUILD_ID: SnowflakeSchema,
    SUDOBOT_SHARD_COUNT: Type.Optional(Type.Integer({ minimum: 1 })),
    SUDOBOT_HIDE_MODIFICATIONS_URL_NOTICE: Type.Enum(["1", "0"], { default: "0" }),
    SUDOBOT_MODIFICATIONS_PUBLIC_URL: Type.Optional(Type.String({ format: "url" }))
});

export const EnvironmentVariableSchemaValidator = Compile(EnvironmentVariableSchema);
export type EnvironmentVariableType = Type.Static<typeof EnvironmentVariableSchema>;
