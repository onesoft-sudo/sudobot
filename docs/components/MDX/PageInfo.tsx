"use client";

import { getPageInfo } from "@/actions/pageinfo";
import useActualPathname from "@/hooks/useActualPathname";
import { branch, GITHUB_REPO_URL } from "@/utils/links";
import { Button } from "@mui/material";
import { Tooltip } from "@nextui-org/react";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";

export default function LastModified() {
    const [date, setDate] = useState<Date | null>(null);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [editURL, setEditURL] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const pathname = useActualPathname();

    useEffect(() => {
        getPageInfo(pathname)
            .then(
                ({ avatarURL, lastModifiedDate, urlEncodedPath, username }) => {
                    setDate(lastModifiedDate);
                    setAvatar(avatarURL);
                    setEditURL(urlEncodedPath);
                    setUsername(username);
                },
            )
            .catch(console.error);
    }, [pathname]);

    if (!date) {
        return <></>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-0 justify-between items-center">
            <div className="flex items-center gap-3">
                {avatar ? (
                    <Tooltip content={username ?? "Unknown"}>
                        <img
                            src={avatar}
                            className="w-[30px] h-[30px] rounded-full [border:1px_solid_#007bff]"
                        />
                    </Tooltip>
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

            <div>
                <Button
                    href={`${GITHUB_REPO_URL}/edit/${encodeURIComponent(
                        branch,
                    )}/${editURL ?? ""}`}
                    target="_blank"
                    rel="noreferrer"
                    startIcon={<MdEdit size={16} />}
                    className="-mt-1"
                >
                    Edit this page
                </Button>
            </div>
        </div>
    );
}
