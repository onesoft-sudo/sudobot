import type { PermissionResolvable } from "./PermissionResolvable";

class PermissionDeniedError extends Error {
    public constructor(
        public readonly permissions: PermissionResolvable,
        message = "You don't have enough permissions to perform this action."
    ) {
        super(message);
    }
}

export default PermissionDeniedError;
