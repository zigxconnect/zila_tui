import React from "react";
import { render } from "ink";
import { Shell } from "./shell/Shell.js";

const inkInstance = render(
  React.createElement(Shell, { inkInstance: { unmount: () => inkInstance.unmount() } }),
);

process.on("uncaughtException", (err) => {
  inkInstance.unmount();
  process.stderr.write(`\nUnhandled error: ${err.message}\n`);
  process.exit(1);
});
