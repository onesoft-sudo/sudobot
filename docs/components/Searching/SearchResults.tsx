import { CircularProgress } from "@nextui-org/react";
import { useEffect, useState, type FC } from "react";
import Link from "../Navigation/Link";

type SearchResultsProps = {
    query: string;
    onClose: () => void;
};

type SearchResultItem = {
    title?: string;
    description?: string;
    data: string;
    match: "title" | "description" | "data";
    url: string;
};

const SearchResults: FC<SearchResultsProps> = ({ query, onClose }) => {
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
            {" "}
            {isLoading ||
                isNotFound ||
                (results?.length && (
                    <div
                        className="max-lg:hidden fixed top-0 left-0 z-[1000000001] bg-transparent h-screen w-screen"
                        onClick={onClose}
                    />
                ))}
            <div className="lg:absolute w-full top-12 lg:z-[1000000002] lg:bg-neutral-900 lg:[box-shadow:0_0_3px_0_rgba(255,255,255,0.4)] rounded-lg p-2 lg:max-h-[60vh] lg:overflow-y-scroll">
                {isLoading && (
                    <div className="flex items-center gap-2 justify-center">
                        <CircularProgress size={"sm"} />
                        <p>Loading...</p>
                    </div>
                )}
                {isNotFound && !isLoading && (
                    <div className="text-center">No result found</div>
                )}
                {!!results?.length &&
                    !isLoading &&
                    !isNotFound &&
                    results.map(result => (
                        <Link
                            key={result.url}
                            href={result.url}
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-800 rounded-lg cursor-pointer block"
                        >
                            <div>{result.title || "Home"}</div>

                            <p className="text-[#999] text-sm">
                                May include information related to{" "}
                                <strong className="text-white">{query}</strong>
                            </p>
                        </Link>
                    ))}
            </div>
        </>
    );
};

export default SearchResults;
