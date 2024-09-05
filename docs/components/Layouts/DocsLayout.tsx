import { Box } from "@mui/material";
import { Fragment, PropsWithChildren } from "react";
import PageInfo from "../MDX/PageInfo";
import TableOfContents from "../MDX/TableOfContents";
import DocsLinkList from "../Navbar/Sidebar";
import Navigator from "../Navigation/Navigator";

export default function DocsLayout({ children }: PropsWithChildren) {
    return (
        <div
            className="grid lg:grid-cols-[3fr_10fr_3.5fr] md:gap-[50px] mb-10 relative"
            id="docs_layout_root"
        >
            <DocsLinkList desktopOnly fragment />

            <div className="lg:px-[50px] xl:px-[100px] lg:max-w-[60vw]">
                <article
                    id="article"
                    className="prose prose-neutral prose-invert prose-code:before:hidden prose-code:after:hidden mt-8 p-3 text-wrap max-w-[100vw] relative"
                >
                    {children}
                </article>
                <br />
                <div className="mx-3">
                    <Navigator />
                    <hr className="[border-top:1px_solid_#333] mb-5" />
                    <PageInfo />
                </div>
            </div>

            <Box
                className="hidden lg:block mr-5 max-h-[calc(100vh-4rem)] overflow-y-scroll pb-8 relative"
                sx={{
                    scrollbarWidth: 0,
                    "::-webkit-scrollbar": {
                        display: "none",
                    },
                }}
            >
                <div className="fixed">
                    <TableOfContents as={Fragment} />
                </div>
            </Box>
        </div>
    );
}
