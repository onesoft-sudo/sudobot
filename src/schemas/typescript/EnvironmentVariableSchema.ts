import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { SnowflakeSchema } from "./SnowflakeSchema";

export const EnvironmentVariableSchema = Type.Object({
    SUDOBOT_TOKEN: Type.String(),
    SUDOBOT_HOME_GUILD_ID: SnowflakeSchema,
    SUDOBOT_SHARD_COUNT: Type.Optional(Type.Integer({ minimum: 1 }))
});

export const EnvironmentVariableSchemaValidator = Compile(EnvironmentVariableSchema);
export type EnvironmentVariableType = Type.Static<typeof EnvironmentVariableSchema>;
