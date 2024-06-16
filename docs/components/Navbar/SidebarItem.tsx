import Link from "@/components/Navigation/Link";
import useActualPathname from "@/hooks/useActualPathname";
import styles from "@/styles/SidebarItem.module.css";
import { DocsPage, flatten, resolveDocsURL } from "@/utils/pages";
import { Button } from "@mui/material";
import { SyntheticEvent, useMemo, useState } from "react";
import { MdExpandMore } from "react-icons/md";

type SidebarItemProps = {
    as: keyof JSX.IntrinsicElements;
    item: DocsPage;
    onNavigate?: () => void;
};

export default function SidebarItem({
    as = "li",
    onNavigate,
    item,
}: SidebarItemProps) {
    const pathname = useActualPathname();
    const flattenPages = useMemo(() => flatten([item]), [item]);
    const [expanded, setExpanded] = useState(false);
    const isFinalExpanded = useMemo(() => {
        return (
            expanded ||
            flattenPages?.some(page => {
                const link = page.type === "page" ? `${page.href}` : "#";

                return (
                    (link === "/" && pathname === "/") ||
                    (link !== "/" &&
                        pathname !== "/" &&
                        pathname.startsWith(link))
                );
            })
        );
    }, [flattenPages, pathname, expanded]);

    const toggle = (e: SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(s => !s);
    };
    const Root = as;
    const url = item.type === "page" ? `${item.href}` : undefined;
    const link = url ? resolveDocsURL(url) : "#";
    const LinkComponent = url ? Link : "a";
    const IconWrapperComponent = url === undefined ? "span" : Button;
    const name = item.data?.short_name ?? item.data?.title;

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
                    paddingRight: 2,
                }}
            >
                <span>{name}</span>
                {!!item.children?.length && (
                    <IconWrapperComponent
                        onClick={toggle}
                        style={{
                            minWidth: 0,
                            padding: 2,
                            margin: 0,
                            color: "white",
                        }}
                    >
                        <MdExpandMore
                            size={20}
                            className={`${
                                isFinalExpanded ? "rotate-180" : ""
                            } transition-[0.2s]`}
                        />
                    </IconWrapperComponent>
                )}
            </LinkComponent>

            {!!item.children?.length && (
                <div
                    className="ml-[13px] pl-[10px] [border-left:1px_solid_#444]"
                    style={{
                        maxHeight: isFinalExpanded
                            ? `${
                                  flattenPages.length *
                                  (50 +
                                      Math.max(
                                          flattenPages
                                              .map(
                                                  p =>
                                                      (
                                                          p.data?.short_name ??
                                                          p.name
                                                      ).length,
                                              )
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
                        {item.children.map(page => (
                            <SidebarItem
                                key={`${page.name}_${page.href}`}
                                as="li"
                                item={page}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </Root>
    );
}
