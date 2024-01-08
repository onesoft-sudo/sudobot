"use client";

import useIsDesktop from "@/hooks/useIsDesktop";
import styles from "@/styles/DocsLinkList.module.css";
import { docsPages } from "@/utils/pages";
import DocsLinkItem from "./DocsLinkItem";

type DocsLinkListProps = {
    expanded?: boolean;
    desktopOnly?: boolean;
};

export default function DocsLinkList({
    expanded,
    desktopOnly = false,
}: DocsLinkListProps) {
    const isDesktop = useIsDesktop();

    if (desktopOnly && !isDesktop) {
        return <></>;
    }

    return (
        <div
            style={
                isDesktop
                    ? {
                          borderRight: "1px solid #222",
                          height: "calc(92vh)",
                          maxHeight: "calc(92vh)",
                          overflowY: "scroll",
                      }
                    : {
                          position: "absolute",
                          left: !expanded ? `100vh` : 0,
                          transition: "ease 0.3s",
                          width: "100%",
                      }
            }
            className={isDesktop ? styles.scrollbarStyles : ""}
        >
            <ul className="list-none m-3">
                {docsPages.map(page => (
                    <DocsLinkItem
                        key={`${page.name}_${page.url}`}
                        as="li"
                        name={page.name}
                        url={page.url}
                        subpages={page.children}
                    />
                ))}
            </ul>
        </div>
    );
}
