import { docsPages } from "@/utils/pages";
import DocsLinkItem from "./DocsLinkItem";

type DocsLinkListProps = {
    expanded: boolean;
};

export default function DocsLinkList({ expanded }: DocsLinkListProps) {
    return (
        <div
            style={{
                position: "absolute",
                left: !expanded ? `100vh` : 0,
                transition: "ease 0.3s",
                width: "100%",
            }}
        >
            <ul className="list-none m-3">
                {docsPages.map(page => (
                    <DocsLinkItem
                        key={`${page.name}_${page.url}`}
                        as="li"
                        name={page.name}
                        url={page.url}
                        subpages={page.children}
                    />
                ))}
            </ul>
        </div>
    );
}
