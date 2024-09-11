import { PermissionFlagsBits } from "discord-api-types/v10";
import { FC } from "react";

const ValidPermissionIdentifiers: FC = () => {
    return (
        <ul>
            {Object.keys(PermissionFlagsBits).map(key => {
                return (
                    <li key={key}>
                        <code>{key}</code>
                    </li>
                );
            })}
        </ul>
    );
};

export default ValidPermissionIdentifiers;
