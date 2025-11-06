import { Type } from "typebox";
import { Compile } from "typebox/compile";

export const EnvironmentVariableSchema = Type.Object({
    BOT_TOKEN: Type.String()
});

export const EnvironmentVariableSchemaValidator = Compile(EnvironmentVariableSchema);
export type EnvironmentVariableType = Type.Static<typeof EnvironmentVariableSchema>;
