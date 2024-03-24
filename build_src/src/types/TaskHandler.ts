import { Awaitable } from "./Awaitable";

export type TaskHandler = () => Awaitable<void>;
