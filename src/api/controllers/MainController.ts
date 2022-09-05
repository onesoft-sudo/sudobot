import { Request } from "express";
import Controller from "../Controller";

export default class MainController extends Controller {
    public async index(request: Request) {
        return { message: "Server is up." };
    }
}