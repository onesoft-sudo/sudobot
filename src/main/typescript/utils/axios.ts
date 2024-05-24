import type Application from "@framework/app/Application";
import { env } from "@main/env/env";
import type { AxiosInstance } from "axios";
import axios from "axios";

let _axiosClient: AxiosInstance;

export const createAxiosClient = (application: Application) => {
    const configUserAgent =
        env.HTTP_USER_AGENT === null
            ? undefined
            : env.HTTP_USER_AGENT ?? `SudoBot/${application.version}`;

    _axiosClient = axios.create({
        headers: {
            "Accept-Encoding": process.isBun ? "gzip" : undefined,
            "User-Agent": configUserAgent
        }
    });

    return _axiosClient;
};

export const getAxiosClient = () => _axiosClient;
