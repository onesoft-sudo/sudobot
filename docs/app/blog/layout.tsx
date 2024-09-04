import BlogLayout from "@/components/Layouts/BlogLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        default: "SudoBot Blog",
        template: "%s | SudoBot Blog",
    },
    description: "The SudoBot Blog",
};

export default BlogLayout;
