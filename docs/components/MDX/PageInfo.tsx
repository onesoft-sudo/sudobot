"use client";

import { getPageInfo } from "@/actions/pageinfo";
import useActualPathname from "@/hooks/useActualPathname";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";

export default function LastModified() {
    const [date, setDate] = useState<Date | null>(null);
    const [avatar, setAvatar] = useState<string | null>(null);
    const pathname = useActualPathname();

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
