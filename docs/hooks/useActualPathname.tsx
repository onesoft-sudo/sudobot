"use client";

import { usePathname } from "next/navigation";

export default function useActualPathname() {
    return usePathname().replace(/\.mdx?$/gi, "");
}
