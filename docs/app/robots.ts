import { absoluteURL } from "@/utils/utils";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: absoluteURL("/sitemap.xml"),
    };
}
