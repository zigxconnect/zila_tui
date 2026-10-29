import "dotenv/config";
import fs from "node:fs";
import React from "react";
import { render } from "ink";
import { fileURLToPath } from "node:url";
import { Shell } from "./shell/Shell.js";

const args = process.argv.slice(2);
const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version: string };

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h") || !process.stdin.isTTY || !process.stdout.isTTY) {
  process.stdout.write([
    `lil-zila ${packageJson.version}`,
    "",
    "Usage: lil-zila",
    "       zila",
    "",
    "Start the interactive Zila terminal assistant.",
    "",
    "Options:",
    "  -h, --help     Show this help",
    "  -v, --version  Show the installed version",
    "",
  ].join("\n"));
  process.exit(0);
}

const inkInstance = render(
  React.createElement(Shell, { inkInstance: { unmount: () => inkInstance.unmount() } }),
);

process.on("uncaughtException", (err) => {
  inkInstance.unmount();
  process.stderr.write(`\nUnhandled error: ${err.message}\n`);
  process.exit(1);
});
