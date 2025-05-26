import { Input } from "@heroui/react";
import { forwardRef, Ref } from "react";
import { MdSearch } from "react-icons/md";

type SearchInputProps = {
    setQuery: (query: string | null) => void;
};

const SearchInput = (
    { setQuery }: SearchInputProps,
    ref: Ref<HTMLInputElement>,
) => {
    return (
        <Input
            ref={ref}
            isClearable
            radius="lg"
            classNames={{
                label: "text-black/50 dark:text-white/90",
                input: [
                    "bg-transparent",
                    "text-black/90 dark:text-white/90",
                    "placeholder:text-default-700/50 dark:placeholder:text-white/60",
                ],
                innerWrapper: "bg-transparent",
                inputWrapper: [
                    "shadow-xl",
                    "bg-default-200/50",
                    "dark:bg-default/60",
                    "backdrop-blur-xl",
                    "backdrop-saturate-200",
                    "hover:bg-default-200/70",
                    "dark:hover:bg-default/70",
                    "group-data-[focus=true]:bg-default-200/50",
                    "dark:group-data-[focus=true]:bg-default/60",
                    "!cursor-text",
                ],
            }}
            onValueChange={setQuery}
            placeholder="Type to search..."
            startContent={
                <MdSearch
                    className="text-black/50 mt-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0"
                    size={23}
                />
            }
        />
    );
};

export default forwardRef(SearchInput);
