import { Tooltip } from "@mui/material";
import { formatDistanceToNowStrict } from "date-fns";
import { type FC } from "react";

type BlogPageFooterProps = {
    author:
        | string
        | {
              name: string;
              link?: string;
              icon?: string;
          };
    postedAt?: Date | string;
};

const BlogPageFooter: FC<BlogPageFooterProps> = ({
    author,
    postedAt = new Date(),
}) => {
    if (typeof author === "string") {
        author = {
            name: author,
        };
    }

    if (typeof postedAt === "string") {
        postedAt = new Date(postedAt);
    }

    return (
        <>
            <hr className="mb-3" />
            <footer className="text-neutral-400">
                <p className="not-prose mb-3 text-sm">
                    This article is licensed under the{" "}
                    <a
                        href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
                        rel="license"
                        target="_blank"
                        className="underline text-blue-500 hover:text-blue-600"
                    >
                        CC BY-NC-ND 4.0
                    </a>{" "}
                    license. Copyright © {postedAt.getFullYear()} OSN
                    Developers.
                    <br />
                    Permission is hereby granted, to share this article in its
                    entirety with credit to the original author and a link to
                    this page, without any modifications or commercial purposes.
                </p>
                <div className="not-prose flex items-center gap-1.5">
                    {author.icon && (
                        <Tooltip
                            title={author.name}
                            arrow
                            classes={{
                                tooltip: "bg-neutral-800",
                                arrow: "text-neutral-800",
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={author.icon}
                                alt={author.name}
                                className="size-8 rounded-full [box-shadow:0_0_1px_2px_rgba(255,255,255,0.2)] inline-block mr-2"
                            />
                        </Tooltip>
                    )}

                    <p>
                        Posted by{" "}
                        <a
                            href={author.link ?? "#"}
                            className={
                                "text-white hover:text-neutral-300 font-semibold"
                            }
                            target={author.link ? "_blank" : ""}
                        >
                            {author.name}
                        </a>{" "}
                        on{" "}
                        {postedAt.toLocaleDateString("en-US", {
                            dateStyle: "long",
                        })}{" "}
                        (
                        {formatDistanceToNowStrict(postedAt, {
                            addSuffix: true,
                        })}
                        )
                    </p>
                </div>
            </footer>
        </>
    );
};

export default BlogPageFooter;
