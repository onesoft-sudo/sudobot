"use client";

import styles from "@/styles/Navigator.module.css";
import { docsPages, resolveDocsURL } from "@/utils/pages";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC } from "react";
import { MdArrowBack, MdArrowForward } from "react-icons/md";

interface NavigatorProps {}

const Navigator: FC<NavigatorProps> = () => {
    const pathname = usePathname();
    let parent = null;
    const currentPage = docsPages.findIndex((page, index) => {
        if (!page.url) {
            return false;
        }

        const url = resolveDocsURL(page.url);

        if (url === pathname) {
            return true;
        }

        if (!page.children) {
            return false;
        }

        for (const child of page.children) {
            if (child.url && resolveDocsURL(child.url)) {
                parent = index;
                return true;
            }
        }

        return false;
    });
    const nextIndex = currentPage + 1;
    const prevIndex = currentPage - 1;
    const nextPage = parent
        ? docsPages[parent].children![nextIndex]
        : docsPages[nextIndex];
    const prevPage = parent
        ? docsPages[parent].children![prevIndex]
        : docsPages[prevIndex];

    return (
        <div
            className={styles.root}
            data-wrap={!nextPage || !prevPage ? "true" : "false"}
        >
            {prevPage && (
                <Link
                    href={prevPage.url ? resolveDocsURL(prevPage.url) : "#"}
                    className={`${styles.navigationControl} ${styles.navigationControlBack}`}
                >
                    <div className={styles.iconWrapper}>
                        <MdArrowBack size={26} />
                    </div>
                    <div className={styles.text}>
                        <small>Back</small>
                        <span>{prevPage.name}</span>
                    </div>
                </Link>
            )}
            {nextPage && (
                <Link
                    href={nextPage.url ? resolveDocsURL(nextPage.url) : "#"}
                    className={`${styles.navigationControl} ${styles.navigationControlNext}`}
                >
                    <div className={styles.text}>
                        <small>Next</small>
                        <span>{nextPage.name}</span>
                    </div>
                    <div className={styles.iconWrapper}>
                        <MdArrowForward size={26} />
                    </div>
                </Link>
            )}
        </div>
    );
};

export default Navigator;
