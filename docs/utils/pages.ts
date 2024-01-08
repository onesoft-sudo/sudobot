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
        name: "Getting Started",
        url: "getting-started",
    },
    {
        name: "Extensions",
        url: "extensions",
        children: [
            {
                name: "Creating an Extension",
                url: "create",
            },
            {
                name: "Installing an Extension",
                url: "install",
            },
        ],
    },
];
