import { execSync } from "child_process";

export type TargetDependency = "all" | "node" | "python" | "git";

export interface InstallPlan {
  command: string;
  description: string;
}

/**
 * Resolves the OS package manager command required to install missing dependencies.
 */
export function getInstallPlan(target: TargetDependency): InstallPlan {
  const platform = process.platform;

  if (platform === "linux") {
    switch (target) {
      case "node":
        return {
          command: "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs",
          description: "Install Node.js 20 LTS via NodeSource",
        };
      case "python":
        return {
          command: "sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv",
          description: "Install Python 3 and pip via apt",
        };
      case "git":
        return {
          command: "sudo apt-get update && sudo apt-get install -y git",
          description: "Install Git via apt",
        };
      case "all":
        return {
          command: "sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv git nodejs npm",
          description: "Install Node.js, Python 3, and Git via apt",
        };
    }
  } else if (platform === "darwin") {
    switch (target) {
      case "node":
        return {
          command: "brew install node",
          description: "Install Node.js via Homebrew",
        };
      case "python":
        return {
          command: "brew install python",
          description: "Install Python 3 via Homebrew",
        };
      case "git":
        return {
          command: "brew install git",
          description: "Install Git via Homebrew",
        };
      case "all":
        return {
          command: "brew install node python git",
          description: "Install Node.js, Python 3, and Git via Homebrew",
        };
    }
  } else if (platform === "win32") {
    switch (target) {
      case "node":
        return {
          command: "winget install OpenJS.NodeJS.LTS",
          description: "Install Node.js LTS via winget",
        };
      case "python":
        return {
          command: "winget install Python.Python.3.11",
          description: "Install Python 3.11 via winget",
        };
      case "git":
        return {
          command: "winget install Git.Git",
          description: "Install Git via winget",
        };
      case "all":
        return {
          command: "winget install OpenJS.NodeJS.LTS && winget install Python.Python.3.11 && winget install Git.Git",
          description: "Install Node.js, Python 3, and Git via winget",
        };
    }
  }

  return {
    command: `echo "Please install ${target} manually for your operating system (${platform})"`,
    description: `Manual installation required on ${platform}`,
  };
}

export function executeDependencyInstall(
  target: TargetDependency,
  onOutput?: (line: string) => void,
): { success: boolean; message: string } {
  const plan = getInstallPlan(target);
  if (onOutput) {
    onOutput(`Executing: ${plan.description}...`);
  }

  try {
    execSync(plan.command, { stdio: "inherit" });
    return { success: true, message: `Successfully executed installer for ${target}` };
  } catch (err: any) {
    return { success: false, message: `Installation failed: ${err.message}` };
  }
}
