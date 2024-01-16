import rehypePrism from "@mapbox/rehype-prism";
import createMDX from "@next/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
    async rewrites() {
        return [{ source: "/:path*.(mdx?)", destination: "/:path*" }];
    },
};

const withMDX = createMDX({
    options: {
        remarkPlugins: [
            remarkGfm,
            remarkFrontmatter,
            [remarkMdxFrontmatter, { name: "metadata" }],
        ],
        rehypePlugins: [
            rehypeSlug,
            [
                rehypeAutolinkHeadings,
                {
                    behavior: "append",
                    properties: { className: "autolink", tabindex: -1 },
                },
            ],
            rehypePrism,
        ],
    },
    webpack(config) {
        require("./generate-sitemap.js");
        return config;
    },
});

export default withMDX(nextConfig);
