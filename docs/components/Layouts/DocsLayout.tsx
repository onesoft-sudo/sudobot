import { GITHUB_REPO_URL, branch } from "@/utils/links";
import { Button } from "@mui/material";
import { headers } from "next/headers";
import "prism-themes/themes/prism-coldark-dark.css";
import { Fragment, PropsWithChildren } from "react";
import { MdEdit } from "react-icons/md";
import PageInfo from "../MDX/PageInfo";
import TableOfContents from "../MDX/TableOfContents";
import DocsLinkList from "../Navbar/DocsLinkList";
import Navigator from "../Navigation/Navigator";

export default function DocsLayout({ children }: PropsWithChildren) {
    const url = headers().get("x-invoke-url");

    return (
        <div className="grid lg:grid-cols-[3fr_10fr_2.5fr] md:gap-[50px] mb-10 relative">
            <DocsLinkList desktopOnly fragment />

            <div className="lg:px-[50px] xl:px-[100px] lg:max-w-[60vw]">
                <article
                    id="article"
                    className="prose prose-neutral prose-invert prose-code:before:hidden prose-code:after:hidden mt-8 p-3 text-wrap max-w-[100vw] relative"
                >
                    <Button
                        className="not-prose min-w-[0] absolute top-[14px] right-[20px] lg:right-0"
                        style={{ minWidth: 0, position: "absolute" }}
                        href={`${GITHUB_REPO_URL}/edit/${encodeURIComponent(
                            branch,
                        )}/docs/app${url}${url === "/" ? "" : "/"}page.mdx`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <MdEdit size={20} />
                    </Button>
                    {children}
                </article>
                <br />
                <div className="mx-3">
                    <Navigator />
                    <hr className="[border-top:1px_solid_#333] mb-5" />

                    <PageInfo />
                </div>
            </div>

            <div className="hidden lg:block mr-5 fixed right-0 max-w-[20vw] max-h-[calc(100vh-50px)] overflow-y-scroll">
                <TableOfContents as={Fragment} />
            </div>
        </div>
    );
}
