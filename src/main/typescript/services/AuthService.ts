import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { User, users } from "@main/models/User";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

@Name("authService")
class AuthService extends Service {
    private async generateToken(user: User) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "48h",
                issuer: process.env.JWT_ISSUER
            }
        );
    }

    public async authenticate(
        credentials: AuthCredentials
    ): Promise<{ success: false } | { success: true; user: User }> {
        const user: User | undefined = await this.application.database.query.users.findFirst({
            where: eq(users.username, credentials.username)
        });

        if (!user) {
            return {
                success: false
            };
        }

        const result = await bcrypt.compare(credentials.password, user.password);

        if (!result) {
            return {
                success: false
            };
        }

        await this.provisionToken(user);

        return {
            success: true,
            user
        };
    }

    public async provisionToken(user: User) {
        if (!user.token || !user.tokenExpiresAt || user.tokenExpiresAt.getTime() <= Date.now()) {
            const token = await this.generateToken(user);
            const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await this.application.database.drizzle
                .update(users)
                .set({
                    token,
                    tokenExpiresAt
                })
                .where(eq(users.id, user.id));

            user.token = token;
            user.tokenExpiresAt = tokenExpiresAt;
        }

        return user;
    }
}

type AuthCredentials = {
    username: string;
    password: string;
};

export default AuthService;
