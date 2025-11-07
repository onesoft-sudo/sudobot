import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { SnowflakeSchema } from "./SnowflakeSchema";

export const EnvironmentVariableSchema = Type.Object({
    BOT_TOKEN: Type.String(),
    HOME_GUILD_ID: SnowflakeSchema
});

export const EnvironmentVariableSchemaValidator = Compile(EnvironmentVariableSchema);
export type EnvironmentVariableType = Type.Static<typeof EnvironmentVariableSchema>;
