"use client";

import { branch } from "@/utils/links";
import { formatDistanceToNowStrict } from "date-fns";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

async function getPageInfo(pathname: string) {
    const githubURL = pathname
        ? `https://api.github.com/repos/onesoft-sudo/sudobot/commits?path=docs%2Fapp${encodeURIComponent(
              pathname,
          )}%2Fpage.mdx&sha=${encodeURIComponent(branch)}`
        : null;
    let lastModifiedDate = new Date();
    let avatarURL = null;

    if (githubURL) {
        try {
            const response = await fetch(githubURL, {
                cache: "force-cache",
            });

            const json = await response.json();
            const timestamp = json?.[0]?.commit?.author?.date;
            avatarURL = json?.[0]?.author?.avatar_url;

            if (timestamp) {
                lastModifiedDate = new Date(timestamp);
            }
        } catch (error) {
            console.error(error);
        }
    }

    return { lastModifiedDate, avatarURL };
}

export default function LastModified() {
    const [date, setDate] = useState<Date | null>(null);
    const [avatar, setAvatar] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        getPageInfo(pathname)
            .then(({ avatarURL, lastModifiedDate }) => {
                setDate(lastModifiedDate);
                setAvatar(avatarURL);
            })
            .catch(console.error);
    }, [pathname]);

    if (!date) {
        return <></>;
    }

    return (
        <div className="flex items-center gap-3">
            {avatar ? (
                <img
                    src={avatar}
                    className="w-[30px] h-[30px] rounded-full [border:1px_solid_#007bff]"
                />
            ) : (
                <div className="w-[30px] h-[30px] rounded-full [border:1px_solid_#007bff] bg-[rgba(0,123,255,0.3)]"></div>
            )}

            <span className="text-[#999]">
                Last modified{" "}
                {formatDistanceToNowStrict(date, {
                    addSuffix: true,
                })}
            </span>
        </div>
    );
}
