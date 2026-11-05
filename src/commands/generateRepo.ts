import fs from "node:fs";
import path from "node:path";
import type { ZilaCommand } from "./registry.js";
import {
  type CurriculumSpec,
  validateCurriculumSpec,
  generateLocalCurriculumRepo,
  publishCurriculumToGitHub,
} from "../utils/curriculumRepoGenerator.js";
import { isAuthenticated, zilaApi } from "../utils/auth.js";
import { getActiveCohort } from "../utils/activeCohort.js";

export function getSkeletonSpec(organization = "Zigex Labs", domain = "Python & Machine Learning", cohort = "Summer 2026 Batch A"): CurriculumSpec {
  return {
    organization,
    cohort,
    domain,
    starterLanguage: "python",
    tracks: [
      {
        name: "beginner",
        modules: [
          {
            title: "Python Fundamentals & Memory Model",
            days: [
              {
                task: "Implement safe circular ring buffer",
                objective: "Master memory allocation, fixed capacities, and zero-copy indexing.",
                tasks: [
                  "Define RingBuffer class with fixed byte capacity",
                  "Implement push() and pop() methods handling wraparound gracefully",
                  "Write unit tests verifying overrun bounds",
                ],
                requirements: [
                  "Do not use external deque libraries",
                  "Include docstrings with complexity notations",
                  "Handle empty buffer pop with IndexError",
                ],
                gradingWeight: 1.0,
                criteriaNotes: "Check commit history for incremental unit tests. Watch out for single-commit copy-paste from stackoverflow.",
                functions: [
                  {
                    name: "create_buffer",
                    args: "capacity: int",
                    returns: "object",
                    doc: "Initialize fixed capacity buffer",
                  },
                  {
                    name: "push_item",
                    args: "buf: object, item: bytes",
                    returns: "bool",
                    doc: "Push byte into ring buffer",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "intermediate",
        modules: [
          {
            title: "Applied Neural Architectures",
            days: [
              {
                task: "Build feedforward tensor graph from scratch",
                objective: "Construct forward and backward automatic differentiation passes.",
                tasks: [
                  "Implement Tensor class with autograd",
                  "Define ReLU and Linear layer transformations",
                  "Train single-layer perceptron on XOR truth table",
                ],
                requirements: [
                  "Zero third-party deep learning libraries (pure Python / NumPy only)",
                  "Track gradient accumulators accurately",
                ],
                gradingWeight: 1.75,
                criteriaNotes: "Ensure gradients are verified against finite differences. Penalize hard-coded truth table lookups.",
                functions: [
                  {
                    name: "forward_pass",
                    args: "inputs: list",
                    returns: "list",
                    doc: "Execute matrix multiplications and activation",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "advanced",
        modules: [
          {
            title: "Autonomous Agents & Memory Systems",
            days: [
              {
                task: "Build reactive autonomous coding agent loop",
                objective: "Design tool-calling supervisor loop with session rollback.",
                tasks: [
                  "Implement agent message queue and dispatcher",
                  "Connect bash tool runner with sandboxing",
                  "Add anti-cheating audit trail logger",
                ],
                requirements: [
                  "Preserve conversation transcript logs",
                  "Support timeout interrupts",
                ],
                gradingWeight: 2.5,
                criteriaNotes: "Inspect Git log for authentic development cadence.",
                functions: [
                  {
                    name: "run_agent_turn",
                    args: "prompt: str",
                    returns: "dict",
                    doc: "Execute single LLM planner step with tool calls",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

export async function executeGenerateRepo(
  specPath?: string,
  options: {
    outputDir?: string;
    push?: boolean;
    org?: string;
    cohortId?: string;
    initPath?: string;
  } = {},
): Promise<string> {
  // 1. Handle --init flag
  if (options.initPath) {
    const targetFile = path.resolve(options.initPath);
    const skeleton = getSkeletonSpec();
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(skeleton, null, 2), "utf-8");
    return [
      `✔ Skeleton curriculum specification written to: ${targetFile}`,
      "Edit this file (or prompt Claude/Gemini to populate it), then run:",
      `  zila generate-repo ${options.initPath} --push`,
    ].join("\n");
  }

  // 2. Validate specPath
  if (!specPath) {
    return [
      "Usage: zila generate-repo <curriculum.json> [--push] [--org zigxconnect] [--cohort <id>]",
      "",
      "Options:",
      "  --init <file.json>   Generate a skeleton curriculum JSON specification",
      "  --push               Create as a PUBLIC repo on GitHub under Zigex organization and push",
      "  --org <org>          GitHub organization (default: 'zigxconnect')",
      "  --cohort <id>        Attach repository to specified cohort program",
      "",
      "Example:",
      "  zila generate-repo curriculum.json --push",
    ].join("\n");
  }

  const resolvedSpec = path.resolve(specPath);
  if (!fs.existsSync(resolvedSpec)) {
    return `Error: Specification file not found at: ${resolvedSpec}`;
  }

  let spec: CurriculumSpec;
  try {
    const raw = fs.readFileSync(resolvedSpec, "utf-8");
    spec = JSON.parse(raw) as CurriculumSpec;
  } catch (err: any) {
    return `Error reading JSON spec: ${err.message}`;
  }

  const errors = validateCurriculumSpec(spec);
  if (errors.length > 0) {
    return ["Specification validation failed:", ...errors.map((e) => `  ✖ ${e}`)].join("\n");
  }

  const outDir =
    options.outputDir ||
    path.join(
      process.cwd(),
      spec.repoName ||
        `${spec.organization.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${spec.domain.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    );

  // 3. Generate Local Repository
  const { totalDays, outputPath } = generateLocalCurriculumRepo(spec, outDir);

  const lines: string[] = [
    `◈ ZILA CURRICULUM REPOSITORY GENERATOR`,
    `Organization: ${spec.organization}`,
    `Domain:       ${spec.domain}`,
    `Cohort:       ${spec.cohort}`,
    `Output Path:  ${outputPath}`,
    `Total Days:   ${totalDays} day folders generated`,
    "",
    "✔ Created root README.md, cohort.json, .gitignore",
    "✔ Created templates/exercise.md deliverable report",
    "✔ Created contributors/.gitkeep intern workspaces",
    "✔ Created tracks (beginner, intermediate, advanced) with day exercises and .supervisor_instructions",
  ];

  // 4. Publish to GitHub if --push requested
  if (options.push) {
    lines.push("");
    lines.push("Publishing repository as PUBLIC to GitHub under Zigex organization...");
    try {
      const pubResult = await publishCurriculumToGitHub(outputPath, spec, {
        org: options.org || "zigxconnect",
        cohortId: options.cohortId,
      });

      lines.push(`✔ GitHub Repository created: ${pubResult.repoUrl} (PUBLIC)`);
      if (pubResult.attachedCohortId) {
        lines.push(`✔ Attached to Cohort ID: ${pubResult.attachedCohortId}`);
        lines.push(`Students in this cohort can now automatically submit tasks against this repository.`);
      }
    } catch (pubErr: any) {
      lines.push(`⚠ GitHub publish notice: ${pubErr.message}`);
      lines.push(`The local repository is ready at: ${outputPath}`);
    }
  } else {
    lines.push("");
    lines.push("Tip: Run with --push to automatically publish as a public repo to GitHub under Zigex org:");
    lines.push(`  zila generate-repo ${specPath} --push`);
  }

  return lines.join("\n");
}

export const generateRepoCommand: ZilaCommand = {
  name: "generate-repo",
  aliases: ["create-curriculum", "gen-repo", "curriculum-repo"],
  description: "Generate a full Zila prototype curriculum repository from a JSON spec and optionally push to GitHub",
  usage: "generate-repo <curriculum.json> [--push] [--init <file>] [--org zigxconnect]",
  category: "zask",
  available: true,
  handler: async (args, output) => {
    let specPath = "";
    let initPath = "";
    let push = false;
    let org = "zigxconnect";
    let cohortId = "";
    let outputDir = "";

    for (let i = 0; i < args.length; i++) {
      const curr = args[i];
      if (!curr) continue;
      if (curr === "--init" && args[i + 1]) {
        initPath = args[i + 1] ?? "";
        i++;
      } else if (curr === "--push") {
        push = true;
      } else if (curr === "--org" && args[i + 1]) {
        org = args[i + 1] ?? "";
        i++;
      } else if (curr === "--cohort" && args[i + 1]) {
        cohortId = args[i + 1] ?? "";
        i++;
      } else if ((curr === "-o" || curr === "--output") && args[i + 1]) {
        outputDir = args[i + 1] ?? "";
        i++;
      } else if (!curr.startsWith("-") && !specPath) {
        specPath = curr;
      }
    }

    output("Processing curriculum generation...", "info");
    const result = await executeGenerateRepo(specPath, { initPath, push, org, cohortId, outputDir });
    output(result, result.includes("✔") ? "success" : result.includes("⚠") ? "warning" : "default");
  },
};
