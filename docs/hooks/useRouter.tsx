"use client";

import { useRouterContext } from "@/contexts/RouterContext";
import { useRouter as useNextRouter } from "next/navigation";

export default function useRouter() {
    const { isChanging, setIsChanging } = useRouterContext();
    const router = useNextRouter();

    return {
        prefetch: router.prefetch,
        back: router.back,
        push(href, options) {
            if (!isChanging) {
                setIsChanging(true);
            }

            router.push(href, options);
        },
        forward: router.forward,
        refresh: router.refresh,
        replace: router.replace,
    } satisfies typeof router;
}
