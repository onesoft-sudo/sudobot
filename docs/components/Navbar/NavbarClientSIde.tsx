"use client";

import useIsMobile from "@/hooks/useIsMobile";
import { Button } from "@mui/material";
import { useState } from "react";
import { MdMenu } from "react-icons/md";
import Drawer from "./Drawer";

export default function NavbarClientSide() {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {isMobile && (
                <>
                    <div className="mobile order-first">
                        <Button
                            style={{ minWidth: 0, color: "white" }}
                            onClick={() => setIsOpen(true)}
                        >
                            <MdMenu size={23} />
                        </Button>
                    </div>

                    <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
                </>
            )}
        </>
    );
}
