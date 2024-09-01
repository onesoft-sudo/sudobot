import urls from "@/sitemap.json";
import { absoluteURL } from "@/utils/utils";
import { MetadataRoute } from "next";

export default function Sitemap(): MetadataRoute.Sitemap {
    return urls.map(url => ({
        url: absoluteURL(url.loc),
        lastModified: url.lastmod,
        priority: url.priority,
    }));
}
