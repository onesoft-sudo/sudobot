import indexJson from "@/index.json";
import {
    BOT_INVITE_REQUEST_URL,
    DISCORD_URL,
    DONATION_URL,
    SUPPORT_EMAIL_ADDRESS,
} from "./links";
import { toTitleCase } from "./utils";

export type DocsPage = {
    name: string;
    url?: string;
    children?: DocsPageWithoutChildren[];
};

export type DocsPageWithoutChildren = Omit<DocsPage, "children">;

export const pages = [
    {
        name: "Home",
        url: "/",
    },
    {
        name: "FAQ",
        url: "/",
    },
    {
        name: "Invite",
        url: BOT_INVITE_REQUEST_URL,
    },
    {
        name: "Support",
        url: SUPPORT_EMAIL_ADDRESS,
    },
    {
        name: "Donate",
        url: DONATION_URL,
    },
    {
        name: "Discord",
        url: DISCORD_URL,
    },
];

export function resolveDocsURL(url: string) {
    return url.startsWith("/") ? url : `/${url}`;
}

export type Index = {
    title?: string;
    description?: string;
    data: string;
};

let index: Index[] | null = null,
    lowercasedIndex: Index[] | null = null;

function loadIndex() {
    if (index !== null) {
        return;
    }

    index = indexJson;
    lowercasedIndex =
        index?.map(entry => ({
            data: entry.data.toLowerCase(),
            title: entry.title?.toLowerCase(),
            description: entry.description?.toLowerCase(),
        })) ?? null;
}

export const getIndex = (lower = false) => {
    if (!index) {
        loadIndex();
    }

    return lower ? lowercasedIndex! : index!;
};

let docsPages: DocsPage[] | null = null;

export const getDocsPages = () => {
    if (!docsPages) {
        loadDocsPages();
    }

    return docsPages!;
};

const excludedFromGrouping = ["features", "getting-started"];
const forceGrouping = ["extensions"];
const hoistedPages = [
    "getting-started",
    "features",
    "features/screenshots",
].map(a => `/${a}`);

function loadDocsPages() {
    if (docsPages) {
        return;
    }

    docsPages = [];

    const flattenedPages = indexJson.map(
        page =>
            ({
                name: page.short_name ?? "Unnamed",
                url: page.url,
            } satisfies DocsPageWithoutChildren),
    );
    const pages: Record<string, DocsPageWithoutChildren[]> = {};

    for (const page of flattenedPages) {
        const splitted = page.url.split("/");
        const [, firstDirectory] = splitted;

        const key =
            (forceGrouping.includes(firstDirectory) ||
                (!excludedFromGrouping.includes(firstDirectory) &&
                    firstDirectory !== "")) &&
            splitted.length > 3
                ? toTitleCase(firstDirectory)
                : "_";

        pages[key] ??= [];
        pages[key].push({
            name: page.name,
            url:
                page.url !== "/" && page.url.endsWith("/")
                    ? page.url.substring(0, page.url.length - 1)
                    : page.url,
        });
    }

    if (pages._) {
        docsPages?.push(
            ...pages._.sort(
                (a, b) => a.name.charCodeAt(0) - b.name.charCodeAt(0),
            ),
        );
    }

    for (const key in pages) {
        if (key === "_") {
            continue;
        }

        docsPages?.push({
            name: key,
            children: pages[key].sort(
                (a, b) => a.name.charCodeAt(0) - b.name.charCodeAt(0),
            ),
        });
    }

    docsPages.sort((a, b) => {
        const aIndex = hoistedPages.indexOf(a.url ?? "");
        const bIndex = hoistedPages.indexOf(b.url ?? "");

        if (a.url === "/") {
            return -1;
        }

        if (b.url === "/") {
            return 1;
        }

        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }

        if (aIndex !== -1) {
            return -1;
        }

        if (bIndex !== -1) {
            return 1;
        }

        return a.name.localeCompare(b.name);
    });
}
