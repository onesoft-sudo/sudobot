import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
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
        const user: User | null = await this.application.prisma.user.findFirst({
            where: {
                username: credentials.username
            }
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

        if (!user.token) {
            const token = await this.generateToken(user);
            const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await this.application.prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    token,
                    tokenExpiresAt
                }
            });

            user.token = token;
            user.tokenExpiresAt = tokenExpiresAt;
        }

        return {
            success: true,
            user
        };
    }
}

type AuthCredentials = {
    username: string;
    password: string;
};

export default AuthService;
