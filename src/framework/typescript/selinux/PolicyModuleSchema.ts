import { SnowflakeSchema } from "@schemas/SnowflakeSchema";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

export const PolicyModuleSchema = Type.Object({
    policy_module: Type.Object({
        name: Type.String(),
        version: Type.Integer({ minimum: 0 })
    }),
    map_types: Type.Array(Type.String()),
    type_labeling: Type.Optional(
        Type.Object({
            commonPatterns: Type.Array(
                Type.Object({
                    pattern: Type.Tuple([Type.String(), Type.String()]),
                    entity_type: Type.Enum(["member", "role", "channel"]),
                    entity_attr: Type.Enum(["name", "username", "nickname", "id", "topic", "parent_id"]),
                    context: Type.Integer()
                })
            ),
            memberPatterns: Type.Array(
                Type.Object({
                    context: Type.Integer(),
                    requiredRoles: Type.Optional(Type.Array(SnowflakeSchema)),
                    excludedRoles: Type.Optional(Type.Array(SnowflakeSchema)),
                })
            )
        })
    ),
    allow_types: Type.Array(Type.Union([Type.String(), Type.BigInt()])),
    deny_types: Type.Array(Type.Union([Type.String(), Type.BigInt()])),
    allow_types_on_targets: Type.Record(
        Type.Integer(),
        Type.Record(Type.Integer(), Type.Union([Type.String(), Type.BigInt()]))
    ),
    deny_types_on_targets: Type.Record(
        Type.Integer(),
        Type.Record(Type.Integer(), Type.Union([Type.String(), Type.BigInt()]))
    )
});

export const PolicyModuleValidator = Compile(PolicyModuleSchema);
export type PolicyModuleType = Type.Static<typeof PolicyModuleSchema>;
