import React from "react";
import { render } from "ink";
import { Shell } from "./shell/Shell.js";

const app = render(<Shell />);

process.on("SIGINT", () => {
    app.unmount();
    process.exit(0);
});