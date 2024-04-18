import urls from "@/sitemap.json";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default function Sitemap(): MetadataRoute.Sitemap {
    return urls.map(url => ({
        url: `https://${headers().get("Host")}${url.loc}`,
        lastModified: url.lastmod,
        priority: url.priority,
    }));
}
