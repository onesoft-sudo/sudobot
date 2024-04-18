import { Skeleton } from "@mui/material";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { ComponentProps } from "react";
import ImageWithSkeleton from "./components/MDX/ImageWithSkeleton";

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        ...components,
        Image: (props: ComponentProps<typeof Image>) => <Image {...props} />,
        ImageWithSkeleton: (
            props: ComponentProps<typeof ImageWithSkeleton>,
        ) => <ImageWithSkeleton {...props} />,
        Skeleton: (props: ComponentProps<typeof Skeleton>) => (
            <Skeleton {...props} />
        ),
    };
}
