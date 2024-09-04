import { Box } from "@mui/material";
import { Fragment, PropsWithChildren } from "react";
import TableOfContents from "../MDX/TableOfContents";

export default function BlogLayout({ children }: PropsWithChildren) {
    return (
        <div className="grid lg:grid-cols-[13fr_4fr] md:gap-[50px] mb-10 relative">
            <div className="lg:px-[50px] xl:px-[100px]">
                <article
                    id="article"
                    className="prose prose-neutral prose-invert prose-code:before:hidden prose-code:after:hidden mt-8 p-3 text-wrap max-w-[100vw] relative"
                >
                    {children}
                </article>
                <br />
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
