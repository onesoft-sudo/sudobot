import { PropsWithChildren } from "react";

export default function DocsLayout({ children }: PropsWithChildren) {
    return (
        <div>
            {children}

            <span className="text-[#999]">Last modified 2 days ago</span>
        </div>
    );
}
