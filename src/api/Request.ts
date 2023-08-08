import { User } from "@prisma/client";
import { Request as ExpressRequest } from "express";

export default interface Request extends ExpressRequest {
    parsedBody?: any;
    user?: User;
    userId?: number;
}
