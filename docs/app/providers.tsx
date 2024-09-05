"use client";

import { RouterContextProvider } from "@/contexts/RouterContext";
import { theme } from "@/utils/theme";
import { ThemeProvider } from "@emotion/react";
import { NextUIProvider } from "@nextui-org/react";
import { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren) {
    return (
        <ThemeProvider theme={theme}>
            <NextUIProvider>
                <RouterContextProvider>{children}</RouterContextProvider>
            </NextUIProvider>
        </ThemeProvider>
    );
}
