"use client";

import { isBlogPath } from "@/utils/pages";
import { usePathname } from "next/navigation";

export const NavbarTitle = () => {
    const pathname = usePathname();

    return (
        <span className="desktop">
            SudoBot {isBlogPath(pathname) ? "Blog" : "Docs"}
        </span>
    );
};
