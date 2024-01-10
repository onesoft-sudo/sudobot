import { PropsWithChildren } from "react";
import TableOfContents from "../MDX/TableOfContents";
import DocsLinkList from "../Navbar/DocsLinkList";
import Navigator from "../Navigation/Navigator";

export default function DocsLayout({ children }: PropsWithChildren) {
    return (
        <div className="grid lg:grid-cols-[3fr_10fr_2.5fr] md:gap-[50px] mb-10">
            <DocsLinkList desktopOnly fragment />
            <div className="lg:px-[50px] xl:px-[100px]">
                <article
                    id="article"
                    className="prose prose-neutral prose-invert mt-8 p-3 text-wrap max-w-[100vw]"
                >
                    {children}
                </article>
                <br />
                <div className="mx-3">
                    <Navigator />
                    <hr className="[border-top:1px_solid_#333] mb-5" />
                    <div className="flex items-center gap-3">
                        <img
                            src="https://avatars.githubusercontent.com/virtual-designer"
                            className="w-[30px] h-[30px] rounded-full [border:1px_solid_#007bff]"
                        />
                        <span className="text-[#999]">
                            Last modified 2 days ago
                        </span>
                    </div>
                </div>
            </div>
            <div className="hidden md:block mr-5">
                <h2 className="text-center my-3 text-lg">Table of Contents</h2>
                <br />
                <TableOfContents elementSelector="#article" />
            </div>
        </div>
    );
}
