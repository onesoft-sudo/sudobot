import type { Snowflake } from "discord.js";
import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { PolicyModuleSchema } from "./PolicyModuleSchema";

export const AVCSchema = Type.Object({
    details: Type.Object({
        version: Type.Integer({ minimum: 0 })
    }),
    typeLabelPatterns: Type.Object({
        members: PolicyModuleSchema["properties"]["type_labeling"]["properties"]["commonPatterns"],
        roles: PolicyModuleSchema["properties"]["type_labeling"]["properties"]["commonPatterns"],
        channels: PolicyModuleSchema["properties"]["type_labeling"]["properties"]["commonPatterns"],
        memberPatterns: PolicyModuleSchema["properties"]["type_labeling"]["properties"]["memberPatterns"],
    }),
    mapTypes: Type.Any(),
    allowTypes: Type.Any(),
    denyTypes: Type.Any(),
    allowTypesOnTargets: Type.Any(),
    denyTypesOnTargets: Type.Any(),
    mapTypeIds: Type.Any(),
    entityContexts: Type.Any(),
    nextTypeId: Type.Integer()
});

export const CacheSchema = Type.Object({
    avc: AVCSchema,
    modules: Type.Any()
});

export const AVCValidator = Compile(AVCSchema);
export const CacheValidator = Compile(CacheSchema);
export type AVCType = Pick<Type.Static<typeof AVCSchema>, "details" | "nextTypeId" | "typeLabelPatterns"> & {
    mapTypes: Map<number, string>;
    mapTypeIds: Map<string, number>;
    allowTypes: Map<number, bigint>;
    denyTypes: Map<number, bigint>;
    allowTypesOnTargets: Map<bigint, bigint>;
    denyTypesOnTargets: Map<bigint, bigint>;
    entityContexts: Map<Snowflake, number>;
};
