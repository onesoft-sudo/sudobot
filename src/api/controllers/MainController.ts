import { Request } from "express";
import Controller from "../Controller";

export default class MainController extends Controller {
    public index(request: Request) {
        console.log(request.method);
        
        return "Hello world";
    }

    public system(request: Request) {
        return "Hello world 2";
    }
}