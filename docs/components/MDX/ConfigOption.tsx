import { Tooltip } from "@mui/material";
import Link from "next/link";
import { Fragment, ReactNode, type FC } from "react";

type ConfigOptionProps = {
    as: FC | keyof JSX.IntrinsicElements;
    optionKey: string;
    type: ReactNode;
    children: ReactNode;
    optional?: boolean;
    defaultValue?: string;
};

export function ConfigOption({
    as: Element = "div",
    type,
    optionKey,
    children,
    optional,
    defaultValue,
}: ConfigOptionProps) {
    return (
        <Element className="bg-gray-50 dark:bg-[rgba(255,255,255,0.08)] p-2 rounded-lg block my-4 relative">
            <div className="font-bold md:text-lg mb-3 flex justify-between items-center not-prose">
                <div className="flex items-start">
                    <span>
                        <code className="text-blue-400">{optionKey}</code>
                        <code>{optional ? "?:" : ":"}</code>
                    </span>
                    <div className="ml-2 inline-block px-1 rounded-lg bg-gray-200 dark:bg-[#333]">
                        {typeof type === "string" ? (
                            <code className="text-teal-400">{type}</code>
                        ) : (
                            <code>{type}</code>
                        )}
                    </div>
                </div>
                <div>
                    {defaultValue && (
                        <div className="px-2 rounded-lg bg-gray-200 dark:bg-[#333] hidden md:inline-block font-normal text-sm md:text-base">
                            Default:{" "}
                            <code className="font-normal text-[#999]">
                                {defaultValue}
                            </code>
                        </div>
                    )}
                    {optional && (
                        <div className="px-2 rounded-lg bg-gray-200 dark:bg-[#333] ml-2 hidden md:inline-block">
                            <span className="font-normal text-sm md:text-base text-[#999]">
                                Optional
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-sm dark:text-[#aaa]">{children}</div>
            <div className="md:hidden">
                {defaultValue && (
                    <div className="px-2 rounded-lg bg-gray-200 dark:bg-[#333] inline-block font-normal text-sm md:text-base mr-2 py-0.5">
                        Default:{" "}
                        <code className="font-normal text-[#999]">
                            {defaultValue}
                        </code>
                    </div>
                )}

                {optional && (
                    <div className="px-2 rounded-lg bg-gray-200 dark:bg-[#333] inline-block font-normal text-sm md:text-base mr-2 py-0.5">
                        <span className="font-normal text-sm md:text-base text-[#999]">
                            Optional
                        </span>
                    </div>
                )}
            </div>
        </Element>
    );
}

export namespace ConfigOption {
    const Union = ({ children }: { children: ReactNode[] }) => (
        <span>
            {children.map((type, index) =>
                children.length > 3 ? (
                    <Fragment key={index}>
                        <span className="mx-2">|</span>
                        {type}
                        <br />
                    </Fragment>
                ) : (
                    <Fragment key={index}>
                        {index > 0 && <span className="mx-2">|</span>}
                        {type}
                    </Fragment>
                ),
            )}
        </span>
    );

    const StringLiteral = (
        props: { value: ReactNode } | { children: ReactNode },
    ) => (
        <span className="text-yellow-600">
            &quot;{"value" in props ? props.value : props.children}&quot;
        </span>
    );

    const ArrayLiteral = ({ children }: { children: ReactNode }) => (
        <>
            <span>
                {Array.isArray(children) ? <>({children})</> : children}
            </span>
            <span className="text-blue-500">[]</span>
        </>
    );

    const Identifier = ({
        children,
        url,
    }: {
        children: ReactNode;
        url?: string;
    }) => (
        <span className="text-teal-400">
            {url ? (
                <Tooltip title="Click to go the definition of this type">
                    <Link href={url} target="_blank" rel="noreferrer">
                        {children}
                    </Link>
                </Tooltip>
            ) : (
                children
            )}
        </span>
    );

    function Null() {
        return <Identifier>null</Identifier>;
    }

    function TupleLiteral({ children }: { children: ReactNode[] }) {
        return (
            <>
                <span className="text-blue-500">[</span>
                {children.map((child, index) => (
                    <Fragment key={index}>
                        {index > 0 && <span className="mr-2">,</span>}
                        {child}
                    </Fragment>
                ))}
                <span className="text-blue-500">]</span>
            </>
        );
    }

    function GenericIdentifier({
        children,
        url,
        genericTypes,
    }: {
        genericTypes: ReactNode[];
        children: ReactNode;
        url?: string;
    }) {
        return (
            <span className="text-teal-400">
                {url ? (
                    <Tooltip title="Click to go the definition of this type">
                        <Link href={url} target="_blank" rel="noreferrer">
                            {children}
                        </Link>
                    </Tooltip>
                ) : (
                    children
                )}
                <span className="text-blue-500">&lt;</span>
                {genericTypes.map((type, index) => (
                    <Fragment key={index}>
                        {index > 0 && <span className="mr-2">,</span>}
                        {type}
                    </Fragment>
                ))}
                <span className="text-blue-500">&gt;</span>
            </span>
        );
    }

    export const Types = {
        Union,
        StringLiteral,
        ArrayLiteral,
        Identifier,
        Null,
        TupleLiteral,
        GenericIdentifier,
    };
}
