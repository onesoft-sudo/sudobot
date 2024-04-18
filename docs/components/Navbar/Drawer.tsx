import useActualPathname from "@/hooks/useActualPathname";
import styles from "@/styles/Drawer.module.css";
import { pages } from "@/utils/pages";
import { Button } from "@mui/material";
import { useState } from "react";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";
import { MdClose, MdNavigateBefore } from "react-icons/md";
import DocsLink from "./DocsLink";
import DocsLinkList from "./Sidebar";

export default function Drawer({
    onClose,
    isOpen,
}: {
    onClose: () => unknown;
    isOpen: boolean;
}) {
    const pathname = useActualPathname();
    const [docsExpanded, setDocsExpanded] = useState(() =>
        pathname.startsWith("/docs"),
    );

    return (
        <>
            <aside
                className={`${styles.aside} ${
                    isOpen ? styles.open : styles.closed
                }`}
            >
                <div
                    className={styles.controls}
                    data-expanded={docsExpanded ? "true" : "false"}
                >
                    {docsExpanded && (
                        <button
                            onClick={() => setDocsExpanded(false)}
                            className="flex justify-center items-center text-[15px] hover:text-[#ccc]"
                        >
                            <MdNavigateBefore size={20} />
                            <span>Main menu</span>
                        </button>
                    )}

                    <Button
                        style={{ minWidth: 0, color: "white" }}
                        onClick={onClose}
                    >
                        <MdClose size={20} />
                    </Button>
                </div>

                <div className="relative">
                    <ul
                        className={styles.list}
                        style={{
                            position: "absolute",
                            left: docsExpanded ? `-100vw` : 0,
                            transition: "ease 0.3s",
                            width: "90%",
                        }}
                    >
                        {pages.map(link => (
                            <li
                                key={`${link.url}_${link.name}`}
                                className={styles.listItem}
                            >
                                <a
                                    href={link.url}
                                    {...(/^http(s?):\/\//gi.test(link.url)
                                        ? {
                                              target: "_blank",
                                              rel: "noreferrer",
                                          }
                                        : {})}
                                    title={link.name}
                                    className={styles.listItemAnchor}
                                    onClick={onClose}
                                >
                                    <span>{link.name}</span>
                                    {/^http(s?):\/\//gi.test(link.url) && (
                                        <HiArrowTopRightOnSquare />
                                    )}
                                </a>
                            </li>
                        ))}

                        <DocsLink
                            onNavigateNext={() => setDocsExpanded(true)}
                        />
                    </ul>
                </div>

                <DocsLinkList expanded={docsExpanded} onNavigate={onClose} />
            </aside>
            <div
                className={`${styles.overlay} ${
                    isOpen ? styles.openOverlay : styles.closedOverlay
                }`}
                onClick={isOpen ? onClose : undefined}
            ></div>
        </>
    );
}
