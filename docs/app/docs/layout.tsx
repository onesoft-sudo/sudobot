import DocsLayout from "@/components/layouts/DocsLayout";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
    return <DocsLayout>{children}</DocsLayout>;
}
