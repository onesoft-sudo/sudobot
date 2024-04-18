"use server";

import { branch } from "@/utils/links";

export async function getPageInfo(pathname: string) {
    "use server";

    const githubURL = pathname
        ? `https://api.github.com/repos/onesoft-sudo/sudobot/commits?path=${encodeURIComponent(
              "docs/app" + (pathname === "/" ? "" : "/(docs)"),
          )}${encodeURIComponent(pathname)}${
              pathname === "/" ? "" : "%2F"
          }page.mdx&sha=${encodeURIComponent(branch)}`
        : null;
    let lastModifiedDate = new Date();
    let avatarURL = null;

    if (githubURL) {
        try {
            const response = await fetch(githubURL, {
                next: {
                    revalidate: 3600,
                },
            });

            const json = await response.json();
            const timestamp = json?.[0]?.commit?.author?.date;
            avatarURL = json?.[0]?.author?.avatar_url;

            if (timestamp) {
                lastModifiedDate = new Date(timestamp);
            }
        } catch (error) {
            console.error(error);
        }
    }

    return { lastModifiedDate, avatarURL };
}
