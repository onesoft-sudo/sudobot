"use client";
import { useRouterContext } from "@/contexts/RouterContext";
import { LinearProgress } from "@mui/material";

export default function Progress() {
    const { isChanging } = useRouterContext();

    if (!isChanging) {
        return <></>;
    }

    return (
        <div className="fixed top-0 left-0 w-[100vw] z-[100000]">
            <LinearProgress />
        </div>
    );
}
