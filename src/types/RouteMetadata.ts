export interface RouteMetadataEntry {
    path: string;
    method: string;
    middleware: Function[];
    handler: Function;
}

export type RouteMetadata = {
    [K in "GET" | "POST" | "PUT" | "PATCH" | "DELETE"]: RouteMetadataEntry | null;
};
