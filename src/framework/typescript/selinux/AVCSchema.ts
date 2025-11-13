import { Type } from "typebox";
import { Compile } from "typebox/compile";

export const AVCSchema = Type.Object({
    avc_details: Type.Object({
        version: Type.Integer({ minimum: 0 })
    }),
    mapTypes: Type.Array(Type.String()),
    allowTypes: Type.Array(Type.BigInt()),
    denyTypes: Type.Array(Type.BigInt()),
    allowTypesOnTargets: Type.Any(),
    denyTypesOnTargets: Type.Any(),
    mapTypeIds: Type.Any(),
});

export const AVCValidator = Compile(AVCSchema);
export type AVCType = Omit<Type.Static<typeof AVCSchema>, "mapTypeIds" | "allowTypesOnTargets" | "denyTypesOnTargets"> & {
    allowTypesOnTargets: Map<bigint, bigint>;
    denyTypesOnTargets: Map<bigint, bigint>;
    mapTypeIds: Map<string, number>;
};
