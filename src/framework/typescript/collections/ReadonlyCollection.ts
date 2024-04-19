import type { Collection } from "discord.js";

export type ReadonlyCollection<K, V> = Omit<Collection<K, V>, "set" | "delete" | "clear" | "sweep">;
