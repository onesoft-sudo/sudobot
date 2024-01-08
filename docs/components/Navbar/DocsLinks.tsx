import styles from "@/styles/Drawer.module.css";
import { Button } from "@mui/material";
import { MdNavigateNext } from "react-icons/md";

type DocsLinksProps = {
    onNavigateNext: () => void;
};

export default function DocsLinks({ onNavigateNext }: DocsLinksProps) {
    return (
        <li className={styles.listItem}>
            <div
                className={`w-[100%] ${styles.listItemAnchor} pr-2`}
                onClick={onNavigateNext}
            >
                <span>Docs</span>
                <Button
                    style={{
                        minWidth: 0,
                        padding: 2,
                        margin: 0,
                        color: "white",
                    }}
                >
                    <MdNavigateNext className={`inline-block`} size={20} />
                </Button>
            </div>

            {/* 
            {expanded && (
                <div>
                    <ul className="list-none">
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
            )} */}
        </li>
    );
}
