#!/usr/bin/env node

const { symlinkSync, rmSync, existsSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { status } = spawnSync("husky", [], { stdio: "inherit" });

if (status) {
    console.error("Husky failed with code: ", status);
}

const link = path.join(process.cwd(), "node_modules/@onesoftnet/blazebuild");

if (existsSync(link)) {
    rmSync(link, { recursive: true });
}

symlinkSync(path.join(process.cwd(), "blazebuild"), link, "dir");
