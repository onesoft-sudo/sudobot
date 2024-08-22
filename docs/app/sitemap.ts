import urls from "@/sitemap.json";
import { MetadataRoute } from "next";

export default function Sitemap(): MetadataRoute.Sitemap {
    return urls.map(url => ({
        url: `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}${url.loc}`,
        lastModified: url.lastmod,
        priority: url.priority,
    }));
}
