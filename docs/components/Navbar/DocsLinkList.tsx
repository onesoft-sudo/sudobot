"use client";

import useIsDesktop from "@/hooks/useIsDesktop";
import styles from "@/styles/DocsLinkList.module.css";
import { getDocsPages } from "@/utils/pages";
import DocsLinkItem from "./DocsLinkItem";

type DocsLinkListProps = {
    expanded?: boolean;
    desktopOnly?: boolean;
    fragment?: boolean;
    onNavigate?: () => void;
};

export default function DocsLinkList({
    expanded,
    desktopOnly = false,
    fragment = false,
    onNavigate,
}: DocsLinkListProps) {
    const isDesktop = useIsDesktop();

    if (desktopOnly && !isDesktop) {
        return <></>;
    }

    return (
        <>
            {fragment && <div></div>}
            <div
                style={
                    isDesktop
                        ? {
                              borderRight: "1px solid #222",
                              height: "calc(92vh)",
                              maxHeight: "calc(92vh)",
                              overflowY: "scroll",
                              position: "fixed",
                              left: 0,
                          }
                        : {
                              position: "absolute",
                              left: !expanded ? `100vh` : 0,
                              transition: "ease 0.3s",
                              width: "100%",
                          }
                }
                className={`${
                    isDesktop ? styles.scrollbarStyles : ""
                } md:w-[10vw] lg:w-[15vw] xl:w-[20vw]`}
            >
                <ul className="list-none m-3">
                    {getDocsPages().map(page => (
                        <DocsLinkItem
                            key={`${page.name}_${page.url}`}
                            as="li"
                            name={page.name}
                            url={page.url}
                            subpages={page.children}
                            onNavigate={onNavigate}
                        />
                    ))}
                </ul>
            </div>
        </>
    );
}
