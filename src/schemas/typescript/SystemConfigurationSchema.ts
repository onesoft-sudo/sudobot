import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { SnowflakeSchema } from "./SnowflakeSchema";

export const SystemConfigurationSchema = Type.Object({
    system_admins: Type.Array(SnowflakeSchema, { default: [] })
});

export const SystemConfigurationSchemaValidator = Compile(SystemConfigurationSchema);
export type SystemConfigurationType = Type.Static<typeof SystemConfigurationSchema>;
