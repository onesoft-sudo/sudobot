"use client";

import useActualPathname from "@/hooks/useActualPathname";
import { FC, useEffect, useRef, useState } from "react";

const selector = ":is(h1, h2, h3, h4, h5, h6)[id]";

export default function TableOfContents({
    as,
}: {
    as?: keyof JSX.IntrinsicElements | FC;
}) {
    const [headings, setHeadings] = useState<
        {
            id: string;
            title: string;
        }[]
    >([]);
    const observer = useRef<IntersectionObserver>();
    const [activeId, setActiveId] = useState("");
    const Root = as ?? "div";
    const pathname = useActualPathname();

    useEffect(() => {
        const headingElements = Array.from(
            document.querySelectorAll(selector) as Iterable<HTMLElement>,
        );

        if (
            headingElements.length > 1 &&
            headingElements[0]?.tagName === "H1"
        ) {
            headingElements.shift();
        }

        const headings = headingElements.map(element => ({
            title: element.innerText.replaceAll("&amp;", "&"),
            id: element.id,
        }));

        setHeadings(headings);
        setActiveId(headings[0].id);
    }, [pathname]);

    useEffect(() => {
        observer.current = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry?.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                }
            },
            {
                rootMargin: "-30% 0% -30% 0%",
            },
        );

        const elements = document.querySelectorAll(selector);
        elements.forEach(element => observer.current?.observe(element));

        return () => {
            observer.current?.disconnect();
            setActiveId("");
        };
    }, [pathname]);

    const onlyOne = headings.length === 1;

    return (
        <Root>
            <h4 className="pl-[15px] mb-3 mt-4 uppercase font-bold tracking-wider text-[15px]">
                On this page
            </h4>
            <ul className="list-none">
                {headings.map(heading => (
                    <li key={heading.id}>
                        <a
                            className={`my-2 block pl-[15px] ${
                                activeId === heading.id || onlyOne
                                    ? "text-blue-500 after:[content:'●'] after:ml-2 after:inline-block after:text-blue-500"
                                    : "hover:text-blue-500"
                            }`}
                            href={`#${heading.id}`}
                            onClick={event => {
                                event.preventDefault();

                                const element = document.getElementById(
                                    heading.id,
                                );

                                element?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                    inline: "center",
                                });
                            }}
                        >
                            {heading.title}
                        </a>
                    </li>
                ))}
            </ul>
        </Root>
    );
}
