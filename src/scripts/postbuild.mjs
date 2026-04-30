import fs from "fs";

const cliPath = "./dist/cli.js";
const content = fs.readFileSync(cliPath, "utf-8");

if (!content.startsWith("#!/usr/bin/env node\n")) {
  fs.writeFileSync(cliPath, "#!/usr/bin/env node\n" + content, "utf-8");
  console.log("postbuild: shebang added to dist/cli.js");
}

// chmod +x (no-op on Windows, harmless)
try {
  fs.chmodSync(cliPath, 0o755);
  console.log("postbuild: dist/cli.js marked executable");
} catch {
  // Windows doesn't support chmod — ignore
}

fs.chmodSync("./bin/zila.js", 0o755);