import Link from "@/components/Navigation/Link";
import { SearchResultItem } from "./SearchModal";

type SearchResultProps = {
    result: SearchResultItem;
    query: string;
    onClick: () => void;
};

function SearchResult({ result, query, onClick }: SearchResultProps) {
    return (
        <Link
            href={result.url}
            onClick={onClick}
            className="p-2 shadow-[0_0_1px_1px_rgba(255,255,255,0.1)] block rounded my-2 bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(0,0,0,0.3)]"
        >
            <h3 className="text-lg lg:text-xl">{result.title}</h3>

            <p className="text-[#999]">
                May include information related to{" "}
                <strong className="text-white">{query}</strong>
            </p>
        </Link>
    );
}

export default SearchResult;
