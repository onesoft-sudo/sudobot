"use client";

import { ComponentProps, FC, useState } from "react";
import Image from "next/image";
import styles from "@/styles/ImageWithSkeleton.module.css";

type ImageWithSkeletonProps = ComponentProps<typeof Image>;

const ImageWithSkeleton: FC<ImageWithSkeletonProps> = ({ ...imageProps }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const { onLoad, ...finalImageProps } = imageProps;

    return (
        <div className="relative">
            <Image
                onLoad={() => {
                    setIsLoaded(true);
                }}
                {...finalImageProps}
            />
            {!isLoaded && (
                <div
                    className={`absolute top-0 left-0 h-[100%] w-[100%] ${styles.skeleton}`}
                ></div>
            )}
        </div>
    );
};

export default ImageWithSkeleton;
