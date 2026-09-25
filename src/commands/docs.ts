import type { ZilaCommand } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export const docsCommand: ZilaCommand = {
  name: "docs",
  aliases: ["documents", "resources", "materials"],
  description: "Browse learning documents and resources",
  usage: "docs [cohort-id] [--category <category>]",
  category: "learning",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    try {
      // Get user's cohorts first
      const cohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!cohortsResponse.ok) {
        output("❌ Failed to fetch cohorts", "error");
        return;
      }

      const cohortsData = await cohortsResponse.json() as { cohorts: any[] };
      const { cohorts } = cohortsData;

      if (cohorts.length === 0) {
        output("📭 You are not enrolled in any cohorts yet.", "warning");
        return;
      }

      const cohortId = args[0] || cohorts[0].id;
      const selectedCohort = cohorts.find((c: any) => c.id === cohortId) || cohorts[0];

      output(`\n📚 Documents: ${selectedCohort.name}\n`, "success");

      // Parse category filter
      const categoryIndex = args.indexOf("--category");
      const category = categoryIndex !== -1 ? args[categoryIndex + 1] : undefined;

      const queryParams = new URLSearchParams();
      if (category) queryParams.set("category", category);

      const response = await fetch(
        `${API_BASE_URL}/api/documents/${selectedCohort.id}?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${authRecord.token}`,
          },
        }
      );

      if (!response.ok) {
        output("❌ Failed to fetch documents", "error");
        return;
      }

      const data = await response.json() as { documents: any[] };
      const { documents } = data;

      if (documents.length === 0) {
        output("📭 No documents available yet.", "warning");
        return;
      }

      // Group by category
      const byCategory: Record<string, any[]> = {};
      documents.forEach((doc: any) => {
        if (!byCategory[doc.category]) {
          byCategory[doc.category] = [];
        }
        byCategory[doc.category]!.push(doc);
      });

      // Display documents
      Object.entries(byCategory).forEach(([cat, docs]) => {
        output(`\n📁 ${cat.toUpperCase()}`, "info");

        docs.forEach((doc: any) => {
          const fileIcon = getFileIcon(doc.fileType);
          output(`   ${fileIcon} ${doc.title}`, "success");

          if (doc.description) {
            output(`      ${doc.description}`, "dim");
          }

          const fileSizeMB = (doc.fileSize / (1024 * 1024)).toFixed(2);
          output(`      📦 ${doc.fileType.toUpperCase()} • ${fileSizeMB} MB`, "dim");
          output(`      🔗 ${doc.fileUrl}`, "dim");

          if (doc.keywords.length > 0) {
            output(`      🏷️  ${doc.keywords.join(", ")}`, "dim");
          }

          output(`      📅 ${new Date(doc.createdAt).toLocaleDateString()}\n`, "dim");
        });
      });

      output("💡 Use  zila search <query>  to find specific topics", "info");

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

export const searchCommand2: ZilaCommand = {
  name: "search-docs",
  aliases: ["find", "lookup"],
  description: "Search documents by keywords or topics",
  usage: "search-docs <query> [--cohort <cohort-id>]",
  category: "learning",
  available: true,
  handler: async (args, output) => {
    if (args.length === 0) {
      output("Usage: zila search-docs <query>", "warning");
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    try {
      // Get cohort ID if provided
      const cohortIndex = args.indexOf("--cohort");
      let cohortId = cohortIndex !== -1 ? args[cohortIndex + 1] : undefined;

      // If no cohort specified, use first enrolled cohort
      if (!cohortId) {
        const cohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
          headers: {
            Authorization: `Bearer ${authRecord.token}`,
          },
        });

        if (cohortsResponse.ok) {
          const cohortsData = await cohortsResponse.json() as { cohorts: any[] };
      const { cohorts } = cohortsData;
          if (cohorts.length > 0) {
            cohortId = cohorts[0].id;
          }
        }
      }

      if (!cohortId) {
        output("❌ No cohort specified and you're not enrolled in any cohort", "error");
        return;
      }

      // Build query from args (excluding --cohort and its value)
      const queryArgs = args.filter((arg, index) =>
        arg !== "--cohort" && (index === 0 || args[index - 1] !== "--cohort")
      );
      const query = queryArgs.join(" ");

      output(`🔍 Searching for "${query}"...`, "info");

      const response = await fetch(`${API_BASE_URL}/api/documents/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, cohortId, limit: 10 }),
      });

      if (!response.ok) {
        output("❌ Search failed", "error");
        return;
      }

      const data = await response.json() as { results: any[]; note: string };
      const { results, note } = data;

      if (results.length === 0) {
        output("\n📭 No documents found matching your query.", "warning");
        return;
      }

      output(`\n📚 Found ${results.length} documents:\n`, "success");

      results.forEach((doc: any, index: number) => {
        const fileIcon = getFileIcon(doc.fileType);
        output(`${index + 1}. ${fileIcon} ${doc.title}`, "success");

        if (doc.description) {
          output(`   ${doc.description}`, "dim");
        }

        output(`   🔗 ${doc.fileUrl}`, "dim");
        output(`   📁 ${doc.category} • ${doc.fileType.toUpperCase()}\n`, "dim");
      });

      if (note) {
        output(`💡 ${note}`, "dim");
      }

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

export const githubReposCommand: ZilaCommand = {
  name: "github-repos",
  aliases: ["repos", "github"],
  description: "View GitHub repositories for learning",
  usage: "github-repos [--cohort <cohort-id>] [--type <type>]",
  category: "learning",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    try {
      output("🔍 Fetching GitHub repositories...", "info");

      const cohortIndex = args.indexOf("--cohort");
      const cohortId = cohortIndex !== -1 ? args[cohortIndex + 1] : undefined;

      const typeIndex = args.indexOf("--type");
      const type = typeIndex !== -1 ? args[typeIndex + 1] : undefined;

      const queryParams = new URLSearchParams();
      if (cohortId) queryParams.set("cohortId", cohortId);
      if (type) queryParams.set("type", type);

      const response = await fetch(`${API_BASE_URL}/api/github/repos?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!response.ok) {
        output("❌ Failed to fetch repositories", "error");
        return;
      }

      const data = await response.json() as { repos: any[] };
      const { repos } = data;

      if (repos.length === 0) {
        output("\n📭 No repositories available yet.", "warning");
        return;
      }

      // Group by type
      const byType: Record<string, any[]> = {};
      repos.forEach((repo: any) => {
        if (!byType[repo.type]) {
          byType[repo.type] = [];
        }
        byType[repo.type]!.push(repo);
      });

      output("\n📦 GitHub Repositories:\n", "success");

      Object.entries(byType).forEach(([repoType, repoList]) => {
        output(`\n🏷️  ${repoType.toUpperCase().replace("_", " ")}`, "info");

        repoList.forEach((repo: any) => {
          output(`   🔗 ${repo.name}`, "success");

          if (repo.description) {
            output(`      ${repo.description}`, "dim");
          }

          output(`      ${repo.url}`, "dim");
          output(`      👨‍🏫 Added by ${repo.addedByName}`, "dim");
          output(`      📅 ${new Date(repo.createdAt).toLocaleDateString()}\n`, "dim");
        });
      });

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

// Helper function
function getFileIcon(fileType: string): string {
  const iconMap: Record<string, string> = {
    pdf: "📄",
    docx: "📝",
    md: "📋",
    txt: "📃",
    pptx: "📊",
    xlsx: "📈",
  };
  return iconMap[fileType.toLowerCase()] || "📄";
}
