import { z } from "zod";

export enum IPCRequestType {
    ListExtensions = "ListExtensions"
}

export const IPCRequestSchema = z.object({
    type: z.enum(
        Object.values({ ...IPCRequestType }) as unknown as [IPCRequestType, ...IPCRequestType[]]
    )
});

export type IPCRequest = z.infer<typeof IPCRequestSchema>;
