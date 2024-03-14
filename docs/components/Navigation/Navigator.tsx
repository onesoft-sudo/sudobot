"use client";

import useActualPathname from "@/hooks/useActualPathname";
import styles from "@/styles/Navigator.module.css";
import { flatten, resolveDocsURL } from "@/utils/pages";
import Link from "next/link";
import { FC } from "react";
import { MdArrowBack, MdArrowForward } from "react-icons/md";

interface NavigatorProps {}

const flatRoutes = flatten().filter(page => page.type !== "directory");

const Navigator: FC<NavigatorProps> = () => {
    const pathname = useActualPathname();

    const currentPage = flatRoutes.findIndex(page => {
        if (!page.href) {
            return false;
        }

        const url = resolveDocsURL(page.href);
        return url === pathname;
    });

    const nextIndex = currentPage + 1;
    const prevIndex = currentPage - 1;
    const nextPage = flatRoutes[nextIndex];
    const prevPage = flatRoutes[prevIndex];

    return (
        <div
            className={styles.root}
            data-wrap={!nextPage || !prevPage ? "true" : "false"}
        >
            {prevPage && (
                <Link
                    href={prevPage.href ? resolveDocsURL(prevPage.href) : "#"}
                    className={`${styles.navigationControl} ${styles.navigationControlBack}`}
                >
                    <div className={styles.iconWrapper}>
                        <MdArrowBack size={26} />
                    </div>
                    <div className={styles.text}>
                        <small>Back</small>
                        <span>
                            {prevPage.data?.short_name ?? prevPage.data?.title}
                        </span>
                    </div>
                </Link>
            )}
            {nextPage && (
                <Link
                    href={nextPage.href ? resolveDocsURL(nextPage.href) : "#"}
                    className={`${styles.navigationControl} ${styles.navigationControlNext}`}
                >
                    <div className={styles.text}>
                        <small>Next</small>
                        <span>
                            {nextPage.data?.short_name ?? nextPage.data?.title}
                        </span>
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
