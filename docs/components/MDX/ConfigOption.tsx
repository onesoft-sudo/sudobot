import { ReactNode, type FC } from "react";

type ConfigOptionProps = {
    as: FC | keyof JSX.IntrinsicElements;
    optionKey: string;
    type: ReactNode;
    children: ReactNode;
    optional?: boolean;
    defaultValue?: string;
};

const ConfigOption: FC<ConfigOptionProps> = ({
    as: Element = "div",
    type,
    optionKey,
    children,
    optional,
    defaultValue,
}) => {
    return (
        <Element className="bg-gray-50 dark:bg-[rgba(255,255,255,0.08)] p-2 rounded-lg block my-4">
            <div className="font-bold md:text-lg mb-3 flex justify-between items-center not-prose">
                <div className="inline-block">
                    <code className="text-blue-400">{optionKey}</code>
                    <code>{optional ? "?:" : ":"}</code>
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
};

export default ConfigOption;
