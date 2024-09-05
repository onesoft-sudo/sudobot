import urls from "@/sitemap.json";
import { absoluteURL } from "@/utils/utils";
import { MetadataRoute } from "next";

export default function Sitemap(): MetadataRoute.Sitemap {
    return urls
        .filter(url => url.loc === "/blog" || url.loc.startsWith("/blog/"))
        .map(url => ({
            url: absoluteURL(url.loc),
            lastModified: url.lastmod,
        }));
}
