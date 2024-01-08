import { PropsWithChildren } from "react";
import DocsLinkList from "../Navbar/DocsLinkList";

export default function DocsLayout({ children }: PropsWithChildren) {
    return (
        <div className="grid lg:grid-cols-[1fr_5fr]">
            <DocsLinkList desktopOnly />
            <div>
                {children}
                <span className="text-[#999] px-3">
                    Last modified 2 days ago
                </span>
            </div>
        </div>
    );
}
