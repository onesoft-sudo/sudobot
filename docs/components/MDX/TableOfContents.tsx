"use client";

import { FC, useEffect, useRef, useState } from "react";

const selector = ":is(h1, h2, h3, h4, h5, h6)[id]";

// TODO: Implement scroll based active heading changing
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

    useEffect(() => {
        const headings = Array.from(
            document.querySelectorAll(selector) as Iterable<HTMLElement>,
        ).map(element => ({
            title: element.innerText.replaceAll("&amp;", "&"),
            id: element.id,
        }));

        setHeadings(headings);
    }, []);

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
                rootMargin: "0% 0% -70% 0%",
            },
        );

        const elements = document.querySelectorAll(selector);
        elements.forEach(element => observer.current?.observe(element));

        return () => observer.current?.disconnect();
    }, []);

    return (
        <Root>
            <h4 className="pl-[15px] mb-3 mt-4 uppercase font-bold tracking-wider text-[15px]">
                On this page
            </h4>
            <ul className="list-none">
                {headings.map(heading => (
                    <li key={heading.id}>
                        <a
                            className={`my-2 block ${
                                activeId === heading.id
                                    ? "text-blue-500 [border-left:3px_solid_#007bff] pl-[15px]"
                                    : "pl-[18px] hover:text-blue-500"
                            }`}
                            href={`#${heading.id}`}
                            onClick={event => {
                                event.preventDefault();

                                const element = document.getElementById(
                                    heading.id,
                                );

                                element?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
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
