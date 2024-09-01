export const toTitleCase = (s: string) =>
    s
        .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
        .replace(/[-_]+(.)/g, (_, c) => " " + c.toUpperCase());

export const absoluteURL = (url: string) =>
    `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
