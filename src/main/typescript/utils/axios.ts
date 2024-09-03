import type Application from "@framework/app/Application";
import { Logger } from "@framework/log/Logger";
import type { AxiosInstance } from "axios";
import axios from "axios";

const logger = new Logger("http", true);
let _axiosClient: AxiosInstance;

export const createAxiosClient = (application: Application) => {
    const configUserAgent =
        process.env.HTTP_USER_AGENT === null
            ? undefined
            : (process.env.HTTP_USER_AGENT ?? `SudoBot/${application.version}`);

    _axiosClient = axios.create({
        headers: {
            "Accept-Encoding": process.isBun ? "gzip" : undefined,
            "User-Agent": configUserAgent
        }
    });

    _axiosClient.interceptors.request.use(config => {
        logger.info(
            `${config.method?.toUpperCase()} ${config.url} - ${config.headers["User-Agent"] ?? "No User-Agent"}`
        );
        return config;
    });

    return _axiosClient;
};

export const getAxiosClient = () => _axiosClient;
