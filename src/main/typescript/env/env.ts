import Environment from "@framework/env/Environment";
import type { EnvironmentVariableRecord } from "@main/schemas/EnvironmentVariableSchema";
import { EnvironmentVariableSchema } from "@main/schemas/EnvironmentVariableSchema";

export const env: EnvironmentVariableRecord = Environment.parseVariables(EnvironmentVariableSchema);
