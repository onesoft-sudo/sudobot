import { BASE_URL } from "./links";

export const toTitleCase = (s: string) =>
    s
        .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
        .replace(/[-_]+(.)/g, (_, c) => " " + c.toUpperCase());

export const absoluteURL = (url: string) => `${BASE_URL}${url}`;
