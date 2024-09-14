"use client";

import useIsDesktop from "@/hooks/useIsDesktop";
import usePlatform from "@/hooks/usePlatform";
import { Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { MdSearch } from "react-icons/md";
import SearchInput from "./SearchInput";
import SearchResults from "./SearchResults";

export default function Search() {
    const platform = usePlatform();
    const isDesktop = useIsDesktop();
    const ref = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState<string | null>(null);
    const [toggled, setToggled] = useState(false);

    useEffect(() => {
        const callback = (event: KeyboardEvent) => {
            if (
                event.code === "Slash" ||
                ((platform === "darwin" ? event.metaKey : event.ctrlKey) &&
                    event.code === "KeyK")
            ) {
                event.preventDefault();
                ref.current?.focus();
            }
        };

        window.addEventListener("keydown", callback);

        return () => window.removeEventListener("keydown", callback);
    }, [platform]);

    return (
        <>
            <div className="relative">
                {isDesktop && <SearchInput ref={ref} setQuery={setQuery} />}

                {query && isDesktop && (
                    <SearchResults
                        query={query}
                        onClose={() => setQuery(null)}
                    />
                )}

                {!isDesktop && (
                    <Button
                        style={{ minWidth: 0, color: "white" }}
                        onClick={() => {
                            setToggled(true);
                        }}
                    >
                        <MdSearch size={23} />
                    </Button>
                )}

                {!isDesktop && toggled && (
                    <div
                        className="fixed top-0 left-0 w-screen h-screen bg-black/30 z-[100000005]"
                        onClick={() => setToggled(false)}
                    >
                        <div
                            className="overflow-y-scroll bg-neutral-900 w-[calc(100vw-2rem)] h-[calc(80vh-4rem)] mx-[1rem] rounded-lg p-[1rem] absolute bottom-4"
                            onClickCapture={event => event.stopPropagation()}
                        >
                            <SearchInput ref={ref} setQuery={setQuery} />

                            {query && (
                                <SearchResults
                                    query={query}
                                    onClose={() => setQuery(null)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
