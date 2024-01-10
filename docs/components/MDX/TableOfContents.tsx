"use client";

import { useEffect, useState } from "react";

// TODO: Implement scroll based active heading changing
export default function TableOfContents({
    elementSelector,
}: {
    elementSelector: string;
}) {
    const [headings, setHeadings] = useState<string[]>([]);

    useEffect(() => {
        const element = document.querySelector(elementSelector);

        if (!element) {
            return;
        }

        const headings = Array.from(
            element.innerHTML.matchAll(/<h[1-6]>(.*?)<\/h[1-6]>/gi),
        ).map(a => a[1].replaceAll("&amp;", "&"));

        console.log(headings);

        setHeadings(headings);
    }, []);

    return (
        <ul className="list-none">
            {headings.map((heading, index) => (
                <li key={heading}>
                    <a
                        className={`my-2 block ${
                            index === 0
                                ? "text-blue-500 [border-left:3px_solid_#007bff] pl-[15px]"
                                : "pl-[18px] hover:text-blue-500"
                        }`}
                        href="#"
                        onClick={() => {
                            const elements = document.querySelectorAll(
                                "h1, h2, h3, h4, h5, h6",
                            );

                            elements.forEach(element => {
                                if (element.innerHTML === heading) {
                                    element.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                    });
                                }
                            });
                        }}
                    >
                        {heading}
                    </a>
                </li>
            ))}
        </ul>
    );
}
