import { Request as ExpressRequest } from "express";
import { IUser } from '../models/User';

export default interface Request extends ExpressRequest {
    user?: IUser;
}