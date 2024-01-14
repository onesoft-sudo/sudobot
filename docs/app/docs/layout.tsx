import DocsLayout from "@/components/Layouts/DocsLayout";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
    return <DocsLayout>{children}</DocsLayout>;
}
