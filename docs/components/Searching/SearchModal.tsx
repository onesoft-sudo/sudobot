import useDebouncedState from "@/hooks/useDebouncedState";
import { Button, CircularProgress, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import SearchResult from "./SearchResult";

type SearchModalProps = {
    onClose: () => void;
};

export type SearchResultItem = {
    title?: string;
    description?: string;
    data: string;
    match: "title" | "description" | "data";
    url: string;
};

export default function SearchModal({ onClose }: SearchModalProps) {
    const [query, , setQuery] = useDebouncedState<string | null>(null, 500);
    const [results, setResults] = useState<SearchResultItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isNotFound, setIsNotFound] = useState(false);

    useEffect(() => {
        if (!query?.trim()) {
            return;
        }

        const controller = new AbortController();

        setIsLoading(true);

        fetch(`/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
        })
            .then(response => response.json())
            .then(data => {
                setIsNotFound(false);
                setIsLoading(false);
                setResults(data.results);
                setIsNotFound(data.results.length === 0);
            })
            .catch(console.error);

        return () => controller.abort();
    }, [query]);

    return (
        <>
            <div
                className="h-[100vh] w-[100vw] fixed top-0 left-0 bg-[rgba(0,0,0,0.3)] z-[10001]"
                onClick={onClose}
            >
                <div
                    onClick={event => event.stopPropagation()}
                    className="max-h-[95vh] block z-[10002] shadow-[0_0_1px_1px_rgba(255,255,255,0.2)] fixed bottom-[10px] lg:top-[50vh] left-[50%] translate-x-[-50%] lg:translate-y-[-50%] bg-[#222] min-h-[50vh] overflow-y-scroll w-[calc(100%-20px)] lg:w-[auto] md:min-w-[50vw] rounded-md p-4"
                >
                    <div className="text-xl lg:text-2xl text-center mb-5 grid grid-cols-[1fr_5fr_1fr]">
                        <span></span>
                        <span>Search Docs</span>
                        <div className="flex justify-end">
                            <Button
                                style={{ minWidth: 0, color: "white" }}
                                onClick={onClose}
                            >
                                <MdClose />
                            </Button>
                        </div>
                    </div>

                    <TextField
                        fullWidth
                        autoFocus
                        type="text"
                        variant="outlined"
                        placeholder="Type here to search"
                        onChange={event => setQuery(event.target.value.trim())}
                        onKeyUp={event => {
                            if (!(event.target as HTMLInputElement).value) {
                                setQuery(null);
                                setResults(null);
                            }

                            if (isNotFound) {
                                setIsNotFound(false);
                            }
                        }}
                    />
                    <br />
                    <div className="mt-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center">
                                <CircularProgress />
                            </div>
                        ) : results && results.length > 0 && !isNotFound ? (
                            <>
                                {results?.length && (
                                    <>
                                        <p className="text-[#aaa] text-sm">
                                            Found {results.length} results.
                                        </p>
                                        <br />
                                    </>
                                )}

                                {results?.map((result, index) => (
                                    <SearchResult
                                        result={result}
                                        query={query ?? ""}
                                        key={index}
                                        onClick={onClose}
                                    />
                                ))}
                            </>
                        ) : isNotFound ? (
                            <h3 className="text-lg md:text-xl text-center">
                                No results found.{" "}
                                <span className="text-[#999]">
                                    Maybe search again with a different
                                    keyboard?
                                </span>
                            </h3>
                        ) : (
                            ""
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
