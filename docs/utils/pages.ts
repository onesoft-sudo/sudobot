import {
    BOT_INVITE_REQUEST_URL,
    DISCORD_URL,
    DONATION_URL,
    SUPPORT_EMAIL_ADDRESS,
} from "./links";

export type DocsPage = {
    name: string;
    url?: string;
    children?: DocsPageWithChildren[];
};

export type DocsPageWithChildren = Omit<DocsPage, "children">;

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

export const docsPages: DocsPage[] = [
    {
        name: "Welcome",
        url: "/",
    },
    {
        name: "Features",
        url: "features",
    },
    {
        name: "Screenshots",
        url: "features/screenshots",
    },
    {
        name: "Getting Started",
        url: "getting-started",
    },
    {
        name: "Configuration",
        children: [
            {
                name: "Guild Configuration",
                url: "configuration/guild-config-schema",
            },
            {
                name: "System Configuration",
                url: "configuration/system-config-schema",
            },
        ],
    },
    {
        name: "Permission System",
        url: "permission-system",
    },
    {
        name: "Extensions",
        children: [
            {
                name: "Extending SudoBot with Extensions",
                url: "extensions/extending-sudobot-with-extensions",
            },
        ],
    },
    {
        name: "Legal",
        children: [
            {
                name: "Terms of Service",
                url: "legal/terms",
            },
            {
                name: "Privacy Policy",
                url: "legal/privacy",
            },
            {
                name: "Why did the bot in my server get terminated?",
                url: "legal/why-did-my-server-get-terminated",
            },
        ],
    },
];

export function resolveDocsURL(url: string) {
    return url.startsWith("/") ? url : `/docs/${url}`;
}
