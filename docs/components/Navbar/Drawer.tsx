"use client";

import styles from "@/styles/Drawer.module.css";
import { DocsPage, pages } from "@/utils/pages";
import { Button } from "@mui/material";
import { MdArrowDropDown, MdClose } from "react-icons/md";

type DrawerProps = {
    items: DocsPage[];
};

export default function Drawer({ items }: DrawerProps) {
    return (
        <>
            <aside className={styles.aside}>
                <div className={styles.controls}>
                    <Button style={{ minWidth: 0, color: "white" }}>
                        <MdClose size={20} />
                    </Button>
                </div>

                <ul className={styles.list}>
                    {pages.map((link) => (
                        <li
                            key={`${link.url}_${link.name}`}
                            className={styles.listItem}
                        >
                            <a
                                href={link.url}
                                {...(/^http(s?):\/\//gi.test(link.url)
                                    ? { target: "_blank", rel: "noreferrer" }
                                    : {})}
                                title={link.name}
                            >
                                {link.name}
                            </a>
                        </li>
                    ))}

                    <li className={styles.listItem}>
                        <a
                            href="#"
                            className="!flex justify-between items-center w-[100%]"
                        >
                            <span>Docs</span>
                            <span>
                                <MdArrowDropDown
                                    className="inline-block"
                                    size={20}
                                />
                            </span>
                        </a>
                    </li>
                </ul>
            </aside>
            <div className={styles.overlay}></div>
        </>
    );
}
