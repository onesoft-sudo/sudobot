"use client";

import { GITHUB_REPO_URL, branch } from "@/utils/links";
import { Button } from "@mui/material";
import { usePathname } from "next/navigation";
import { MdEdit } from "react-icons/md";

export default function EditButton() {
    const pathname = usePathname();

    return (
        <Button
            className="desktop not-prose min-w-[0] absolute top-[14px] right-[20px] lg:right-0"
            style={{ minWidth: 0, position: "absolute" }}
            href={`${GITHUB_REPO_URL}/edit/${encodeURIComponent(
                branch,
            )}/docs/app${pathname === "/" ? "" : "/(docs)"}${pathname?.replace(
                /\.mdx?$/,
                "",
            )}${pathname === "/" ? "" : "/"}page.mdx`}
            target="_blank"
            rel="noreferrer"
        >
            <MdEdit size={20} />
        </Button>
    );
}
