"use client";

import useIsMobile from "@/hooks/useIsMobile";
import { docsPages } from "@/utils/pages";
import Drawer from "./Drawer";

export default function NavbarClientSide() {
    const isMobile = useIsMobile();

    return <>{isMobile && <Drawer items={docsPages} />}</>;
}
