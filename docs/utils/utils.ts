export const toTitleCase = (s: string) =>
    s
        .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
        .replace(/[-_]+(.)/g, (_, c) => " " + c.toUpperCase());
