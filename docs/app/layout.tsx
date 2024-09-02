import Navbar from "@/components/Navbar/Navbar";
import Progress from "@/components/Navigation/Progress";
import { BASE_URL } from "@/utils/links";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PropsWithChildren } from "react";
import "../styles/globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: "SudoBot Documentation",
        template: "%s | SudoBot Documentation",
    },
    description: "A guide to get you started with SudoBot!",
    alternates: {
        canonical: "./",
    },
};

export const viewport: Viewport = {
    colorScheme: "dark",
    initialScale: 1,
    themeColor: "#000",
};

export default function RootLayout({ children }: PropsWithChildren) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <Providers>
                    <Navbar />
                    <Progress />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
