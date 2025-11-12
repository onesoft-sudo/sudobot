import { Type } from "typebox";
import { Compile } from "typebox/compile";

export const PolicyModuleSchema = Type.Object({
    policy_module: Type.Object({
        name: Type.String(),
        version: Type.Integer({ minimum: 0 })
    }),
    map_types: Type.Record(Type.Integer(), Type.String()),
    allow_types: Type.Record(Type.Integer(), Type.Union([Type.String(), Type.BigInt()])),
    deny_types: Type.Record(Type.Integer(), Type.Union([Type.String(), Type.BigInt()])),
    allow_types_on_targets: Type.Record(Type.Integer(), Type.Record(Type.Integer(), Type.Union([Type.String(), Type.BigInt()]))),
    deny_types_on_targets: Type.Record(Type.Integer(), Type.Record(Type.Integer(), Type.Union([Type.String(), Type.BigInt()]))),
});

export const PolicyModuleValidator = Compile(PolicyModuleSchema);
export type PolicyModuleType = Type.Static<typeof PolicyModuleSchema>;
