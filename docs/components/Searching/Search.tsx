"use client";

import useIsDesktop from "@/hooks/useIsDesktop";
import usePlatform from "@/hooks/usePlatform";
import styles from "@/styles/Search.module.css";
import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import { MdSearch } from "react-icons/md";
import SearchModal from "./SearchModal";

export default function Search() {
    const platform = usePlatform();
    const isDesktop = useIsDesktop();
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const callback = (event: KeyboardEvent) => {
            if (
                event.code === "Slash" ||
                ((platform === "darwin" ? event.metaKey : event.ctrlKey) &&
                    event.code === "KeyK")
            ) {
                event.preventDefault();
                setTimeout(() => setModalOpen(true), 120);
            } else if (event.code === "Escape" && modalOpen) {
                event.preventDefault();
                setModalOpen(false);
            }
        };

        window.addEventListener("keydown", callback);

        return () => window.removeEventListener("keydown", callback);
    }, [modalOpen]);

    return (
        <>
            <div className={styles.root}>
                {!isDesktop && (
                    <Button
                        className="min-w-[0] text-white"
                        onClick={() => setModalOpen(true)}
                    >
                        <MdSearch size={23} />
                    </Button>
                )}
                {isDesktop && <MdSearch size={25} />}
                {isDesktop && (
                    <div
                        className={styles.input}
                        onClick={() => setModalOpen(true)}
                    >
                        Search anything
                    </div>
                )}
                {isDesktop && (
                    <span className={styles.shortcut}>
                        {platform === "darwin" ? "⌘" : "Ctrl +"} K
                    </span>
                )}
            </div>
            {modalOpen && <SearchModal onClose={() => setModalOpen(false)} />}
        </>
    );
}
