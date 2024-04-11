import promise from "./index";

// @ts-expect-error - Bun supports top-level await by default
await promise;
