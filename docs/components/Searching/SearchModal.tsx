import useDebouncedState from "@/hooks/useDebouncedState";
import {
    Button,
    CircularProgress,
    TextField,
    ThemeProvider,
    createTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import SearchResult from "./SearchResult";

type SearchModalProps = {
    onClose: () => void;
};

const theme = createTheme({
    palette: {
        mode: "dark",
    },
});

export type SearchResultItem = {
    title?: string;

    description?: string;
    data: string;
    match: "title" | "description" | "data";
    url: string;
};

export default function SearchModal({ onClose }: SearchModalProps) {
    const [query, isQueued, setQuery] = useDebouncedState<string | null>(null);
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!query?.trim()) {
            return;
        }

        console.log(query);

        const controller = new AbortController();

        if (!isLoading) {
            setIsLoading(true);
        }

        fetch(`/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
        })
            .then(response => response.json())
            .then(data => {
                setIsLoading(false);
                setResults(data.results);
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
                    className="block z-[10002] shadow-[0_0_1px_1px_rgba(255,255,255,0.2)] fixed bottom-[10px] lg:top-[50vh] left-[50%] translate-x-[-50%] lg:translate-y-[-50%] bg-[#222] min-h-[50vh] overflow-y-scroll w-[calc(100%-20px)] lg:w-[auto] md:min-w-[50vw] rounded-md p-4"
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
                    <ThemeProvider theme={theme}>
                        <TextField
                            fullWidth
                            autoFocus
                            type="text"
                            variant="outlined"
                            placeholder="Type here to search"
                            onChange={event =>
                                setQuery(event.target.value.trim())
                            }
                            onKeyUp={event => {
                                if (!(event.target as HTMLInputElement).value) {
                                    setQuery(null);
                                    setResults([]);
                                }
                            }}
                        />
                    </ThemeProvider>
                    <br />
                    <div className="mt-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center">
                                <CircularProgress />
                            </div>
                        ) : (
                            results?.map((result, index) => (
                                <SearchResult
                                    result={result}
                                    query={query ?? ""}
                                    key={index}
                                    onClick={onClose}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
