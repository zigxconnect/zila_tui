import type { ZilaCommand } from "../registry.js";
import { checkEnvironmentDependencies } from "../../utils/dependencyChecker.js";
import { executeDependencyInstall, getInstallPlan, type TargetDependency } from "../../utils/dependencyInstaller.js";

export const initCommand: ZilaCommand = {
  name: "init",
  aliases: ["i", "zila-init"],
  description: "Check or install required environment runtimes (Node, Python, Git) and setup workspace",
  usage: "init [--all | --python | --node | --git | --check]",
  category: "setup",
  available: true,
  handler: async (args, output, shell) => {
    // If specific installer flag passed:
    if (args.includes("--all") || args.includes("-a")) {
      handleInstallFlag("all", output);
      return;
    }
    if (args.includes("--python") || args.includes("-p")) {
      handleInstallFlag("python", output);
      return;
    }
    if (args.includes("--node") || args.includes("-n")) {
      handleInstallFlag("node", output);
      return;
    }
    if (args.includes("--git") || args.includes("-g")) {
      handleInstallFlag("git", output);
      return;
    }

    // Default or --check: Perform diagnostic environment inspection
    const diagnostics = checkEnvironmentDependencies();

    output("─".repeat(72), "dim");
    output("lil-zila › environment dependency check", "info");
    output("─".repeat(72), "dim");

    const formatRow = (name: string, status: boolean, version?: string, required?: string) => {
      const icon = status ? "✔" : "✖";
      const iconType = status ? "success" : "error";
      const colName = name.padEnd(24);
      const colVer = (status ? (version || "Installed") : "NOT FOUND").padEnd(16);
      const colReq = `Required: ${required || "Yes"}`;
      output(`[${icon}] ${colName} ${colVer} ${colReq}`, iconType);
    };

    formatRow(diagnostics.node.name, diagnostics.node.installed, diagnostics.node.version, diagnostics.node.required);
    formatRow(diagnostics.python.name, diagnostics.python.installed, diagnostics.python.version, diagnostics.python.required);
    formatRow(diagnostics.git.name, diagnostics.git.installed, diagnostics.git.version, diagnostics.git.required);

    output("─".repeat(72), "dim");

    if (diagnostics.allInstalled) {
      output("✔ All core dependencies are installed and verified!", "success");
      output("👉 Next step: type 'agent --setup' to configure your autonomous AI coding partner.", "info");
    } else {
      output("! Missing required dependencies detected.", "warning");
      output("To install automatically, run:", "info");
      if (!diagnostics.node.installed) output("  zila init --node    (Install Node.js runtime)", "dim");
      if (!diagnostics.python.installed) output("  zila init --python  (Install Python 3 & pip)", "dim");
      if (!diagnostics.git.installed) output("  zila init --git     (Install Git version control)", "dim");
      output("  zila init --all     (Install all missing tools)", "dim");
    }
    output("─".repeat(72), "dim");

    // If shell interactive init screen requested and all are ready:
    if (diagnostics.allInstalled && shell?.startInit && !args.includes("--check") && !args.includes("-c")) {
      shell.startInit();
    }
  },
};

function handleInstallFlag(target: TargetDependency, output: (text: string, type?: any) => void) {
  const plan = getInstallPlan(target);
  output(`Initiating installation for ${target}: ${plan.description}`, "info");
  output(`$ ${plan.command}`, "dim");
  const result = executeDependencyInstall(target, (msg) => output(msg, "dim"));
  if (result.success) {
    output(`✔ ${result.message}`, "success");
    output("Run 'zila init' to re-verify environment readiness.", "info");
  } else {
    output(`✖ ${result.message}`, "error");
    output("Please execute the suggested command manually using root / admin privileges.", "warning");
  }
}
