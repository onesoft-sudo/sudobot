"use client";

import { RouterContextProvider } from "@/contexts/RouterContext";
import { theme } from "@/utils/theme";
import { ThemeProvider } from "@emotion/react";
import { HeroUIProvider } from "@heroui/react";
import { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren) {
    return (
        <ThemeProvider theme={theme}>
            <HeroUIProvider>
                <RouterContextProvider>{children}</RouterContextProvider>
            </HeroUIProvider>
        </ThemeProvider>
    );
}
