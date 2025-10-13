import { z } from "zod";

export enum IPCRequestType {
    ListExtensions = "ListExtensions",
    LoadExtension = "LoadExtension"
}

export const IPCRequestSchema = z.union([
    z.object({
        type: z.literal(IPCRequestType.ListExtensions)
    }),
    z.object({
        type: z.literal(IPCRequestType.LoadExtension),
        file: z.string()
    })
]);

export type IPCRequest = z.infer<typeof IPCRequestSchema>;
