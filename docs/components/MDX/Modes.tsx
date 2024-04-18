import { MdCheck, MdClose } from "react-icons/md";

type ModesProps = {
    modes: Array<"legacy" | "interaction">;
};

export default function Modes({ modes }: ModesProps) {
    return (
        <div>
            <div className="flex items-center gap-2">
                {modes.includes("legacy") ? (
                    <MdCheck className="text-green-500" />
                ) : (
                    <MdClose className="text-red-500" />
                )}{" "}
                Legacy
            </div>
            <div className="flex items-center gap-2">
                {modes.includes("interaction") ? (
                    <MdCheck className="text-green-500" />
                ) : (
                    <MdClose className="text-red-500" />
                )}{" "}
                Interactions
            </div>
        </div>
    );
}
