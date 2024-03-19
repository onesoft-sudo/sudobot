import { CommandPermissionLike } from "../commands/Command";

export class PermissionDeniedError extends Error {
    private permissions: CommandPermissionLike[] = [];

    public setPermissions(permissions: CommandPermissionLike[]) {
        this.permissions = permissions;
        return this;
    }

    public getPermissions() {
        return this.permissions;
    }
}

/**
 * Throws a PermissionDeniedError with the given permissions.
 *
 * @param permissions The permissions that were denied.
 */
export const deny = (
    permissionsOrError: CommandPermissionLike[] | PermissionDeniedError | string = []
) => {
    if (permissionsOrError instanceof PermissionDeniedError) {
        throw permissionsOrError;
    }

    if (typeof permissionsOrError === "string") {
        throw new PermissionDeniedError(permissionsOrError);
    }

    throw new PermissionDeniedError("Permission denied").setPermissions(permissionsOrError);
};
