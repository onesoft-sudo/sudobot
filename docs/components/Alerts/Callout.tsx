import { ReactNode } from "react";
import { IconType } from "react-icons";
import {
    MdCheckCircle,
    MdError,
    MdInfo,
    MdNoteAlt,
    MdWarning,
} from "react-icons/md";

type CalloutProps = {
    children?: ReactNode;
    type: "info" | "warning" | "danger" | "success" | "note";
    hideHeading?: boolean;
    hideIcon?: boolean;
    title?: string;
};

const styles: Record<CalloutProps["type"], string> = {
    danger: "bg-red-500 before:bg-red-600 [--tw-bg-opacity:0.2]",
    info: "bg-[rgba(0,123,255,0.2)] before:bg-blue-600",
    note: "bg-[rgba(255,255,255,0.2)] before:bg-white",
    success: "bg-green-500 before:bg-green-600 [--tw-bg-opacity:0.2]",
    warning: "bg-yellow-500 before:bg-yellow-600 [--tw-bg-opacity:0.2]",
};

const headingStyles: Record<CalloutProps["type"], string> = {
    danger: "text-red-500",
    info: "text-white",
    note: "text-white",
    success: "text-green-500",
    warning: "text-yellow-600",
};

const icons: Record<CalloutProps["type"], IconType> = {
    note: MdNoteAlt,
    danger: MdError,
    info: MdInfo,
    success: MdCheckCircle,
    warning: MdWarning,
};

export default function Callout({
    type,
    children,
    hideHeading = false,
    hideIcon = false,
    title,
}: CalloutProps) {
    const Icon = icons[type];
    return (
        <div
            className={`${
                hideHeading ? "flex items-center gap-5" : ""
            } my-3 p-3 pl-5 overflow-hidden relative rounded-md before:absolute before:left-0 before:h-[100%] before:top-0 before:w-[3px] ${
                styles[type]
            }`}
        >
            {!hideIcon && !hideHeading && (
                <div
                    className={`flex items-center gap-3 mb-3 ${headingStyles[type]}`}
                >
                    <Icon size={25} />
                    <span className="font-bold">
                        {title ??
                            `${type[0].toUpperCase()}${type.substring(1)}`}
                    </span>
                </div>
            )}
            {!hideIcon && hideHeading && (
                <div>
                    <Icon size={25} />
                </div>
            )}
            <div className="*:m-0 *:p-0">{children}</div>
        </div>
    );
}
