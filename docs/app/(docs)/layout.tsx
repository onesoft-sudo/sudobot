import DocsLayout from "@/components/Layouts/DocsLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        default: "SudoBot Documentation",
        template: "%s | SudoBot Documentation",
    },
};

export default DocsLayout;
