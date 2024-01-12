import "prism-themes/themes/prism-coldark-dark.css";
import { Fragment, PropsWithChildren } from "react";
import PageInfo from "../MDX/PageInfo";
import TableOfContents from "../MDX/TableOfContents";
import DocsLinkList from "../Navbar/DocsLinkList";
import Navigator from "../Navigation/Navigator";

export default async function DocsLayout({ children }: PropsWithChildren) {
    return (
        <div className="grid lg:grid-cols-[3fr_10fr_2.5fr] md:gap-[50px] mb-10 relative">
            <DocsLinkList desktopOnly fragment />

            <div className="lg:px-[50px] xl:px-[100px] lg:max-w-[60vw]">
                <article
                    id="article"
                    className="prose prose-neutral prose-invert prose-code:before:hidden prose-code:after:hidden mt-8 p-3 text-wrap max-w-[100vw]"
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

            <div className="hidden lg:block mr-5 fixed right-0 max-w-[20vw] max-h-[calc(100vh-50px)] overflow-y-scroll">
                <TableOfContents as={Fragment} />
            </div>
        </div>
    );
}
