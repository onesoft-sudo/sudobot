import createMDX from "@next/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ["js", "jsx", "mdx", "ts", "tsx", "md"],
    async rewrites() {
        return [{ source: "/:path*.(mdx?)", destination: "/:path*" }];
    },
};

/** @type {import('rehype-pretty-code').Options} */
const rehypePrettyCodeOptions = {
    theme: "material-theme-ocean",
};

const withMDX = createMDX({
    extension: /\.mdx?$/,
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
            [rehypePrettyCode, rehypePrettyCodeOptions],
        ],
    },
    webpack(config) {
        require("./generate-sitemap.js");
        return config;
    },
});

export default withMDX(nextConfig);
