import styles from "@/styles/DocsLinkItem.module.css";
import { DocsPageWithChildren } from "@/utils/pages";
import { Button } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyntheticEvent, useState } from "react";
import { MdExpandMore } from "react-icons/md";

type DocsLinkItemProps = {
    as: keyof JSX.IntrinsicElements;
    url?: string;
    name: string;
    subpages?: DocsPageWithChildren[];
    onNavigate?: () => void;
};

export default function DocsLinkItem({
    as = "li",
    url,
    name,
    onNavigate,
    subpages = [],
}: DocsLinkItemProps) {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(() =>
        subpages.some(page => {
            const link = page.url
                ? page.url.startsWith("/")
                    ? page.url
                    : `/docs/${page.url}`
                : "#";
            return link === pathname;
        }),
    );
    const toggle = (e: SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(s => !s);
    };
    const Root = as;
    const link = url ? (url.startsWith("/") ? url : `/docs/${url}`) : "#";
    const LinkComponent = url ? Link : "a";
    const IconWrapperComponent = url === undefined ? "span" : Button;

    return (
        <Root
            className={`${styles.root} ${
                pathname === link ? styles.active : ""
            }`}
        >
            <LinkComponent
                className={styles.anchor}
                href={link}
                title={name}
                onClick={url !== undefined ? onNavigate : toggle}
                style={{
                    paddingRight: url !== undefined ? 2 : undefined,
                }}
            >
                <span>{name}</span>
                {subpages.length > 0 && (
                    <IconWrapperComponent
                        onClick={toggle}
                        style={{
                            minWidth: 0,
                            padding: 5,
                            margin: 0,
                            color: "white",
                        }}
                    >
                        <MdExpandMore
                            size={20}
                            className={`${
                                expanded ? "rotate-180" : ""
                            } transition-[0.2s]`}
                        />
                    </IconWrapperComponent>
                )}
            </LinkComponent>

            {subpages.length > 0 && (
                <div
                    className="ml-[13px] pl-[10px] [border-left:1px_solid_#444]"
                    style={{
                        maxHeight: expanded
                            ? `${
                                  subpages.length *
                                  (50 +
                                      Math.max(
                                          subpages
                                              .map(p => p.name.length)
                                              .sort()[0] - 10,
                                          0,
                                      ))
                              }px`
                            : 0,
                        transition: "0.2s",
                        overflowY: "hidden",
                    }}
                >
                    <ul className="list-none">
                        {subpages.map(page => (
                            <DocsLinkItem
                                key={`${page.name}_${page.url}`}
                                as="li"
                                name={page.name}
                                url={page.url}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </Root>
    );
}
