import React from "react";
import { render } from "ink";
import { Shell } from "./shell/Shell.js";

// Ink handles raw TTY mode internally; we just need to render.
const app = render(React.createElement(Shell));

// Fallback: if something unhandled kills the process, unmount cleanly.
process.on("uncaughtException", (err) => {
  app.unmount();
  process.stderr.write(`\nUnhandled error: ${err.message}\n`);
  process.exit(1);
});
