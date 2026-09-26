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
   output("[WARN] Not authenticated. Run zila auth first.", "error");
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
    output("[ERROR] Failed to fetch cohorts", "error");
    return;
   }

   const cohortsData = await cohortsResponse.json() as { cohorts: any[] };
   const { cohorts } = cohortsData;

   if (cohorts.length === 0) {
    output("[EMPTY] You are not enrolled in any cohorts yet.", "warning");
    return;
   }

   const cohortId = args[0] || cohorts[0].id;
   const selectedCohort = cohorts.find((c: any) => c.id === cohortId) || cohorts[0];

   output(`\n[DOC] Documents: ${selectedCohort.name}\n`, "success");

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
    output("[ERROR] Failed to fetch documents", "error");
    return;
   }

   const data = await response.json() as { documents: any[] };
   const { documents } = data;

   if (documents.length === 0) {
    output("[EMPTY] No documents available yet.", "warning");
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
    output(`\n[DIR] ${cat.toUpperCase()}`, "info");

    docs.forEach((doc: any) => {
     const fileIcon = getFileIcon(doc.fileType);
     output(`  ${fileIcon} ${doc.title}`, "success");

     if (doc.description) {
      output(`   ${doc.description}`, "dim");
     }

     const fileSizeMB = (doc.fileSize / (1024 * 1024)).toFixed(2);
     output(`   [PKG] ${doc.fileType.toUpperCase()} • ${fileSizeMB} MB`, "dim");
     output(`   [LINK] ${doc.fileUrl}`, "dim");

     if (doc.keywords.length > 0) {
      output(`   [TAG] ${doc.keywords.join(", ")}`, "dim");
     }

     output(`   [DATE] ${new Date(doc.createdAt).toLocaleDateString()}\n`, "dim");
    });
   });

   output("[TIP] Use zila search <query> to find specific topics", "info");

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
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
   output("[WARN] Not authenticated. Run zila auth first.", "error");
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
    output("[ERROR] No cohort specified and you're not enrolled in any cohort", "error");
    return;
   }

   // Build query from args (excluding --cohort and its value)
   const queryArgs = args.filter((arg, index) =>
    arg !== "--cohort" && (index === 0 || args[index - 1] !== "--cohort")
   );
   const query = queryArgs.join(" ");

   output(`[SEARCH] Searching for "${query}"...`, "info");

   const response = await fetch(`${API_BASE_URL}/api/documents/search`, {
    method: "POST",
    headers: {
     Authorization: `Bearer ${authRecord.token}`,
     "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, cohortId, limit: 10 }),
   });

   if (!response.ok) {
    output("[ERROR] Search failed", "error");
    return;
   }

   const data = await response.json() as { results: any[]; note: string };
   const { results, note } = data;

   if (results.length === 0) {
    output("\n[EMPTY] No documents found matching your query.", "warning");
    return;
   }

   output(`\n[DOC] Found ${results.length} documents:\n`, "success");

   results.forEach((doc: any, index: number) => {
    const fileIcon = getFileIcon(doc.fileType);
    output(`${index + 1}. ${fileIcon} ${doc.title}`, "success");

    if (doc.description) {
     output(`  ${doc.description}`, "dim");
    }

    output(`  [LINK] ${doc.fileUrl}`, "dim");
    output(`  [DIR] ${doc.category} • ${doc.fileType.toUpperCase()}\n`, "dim");
   });

   if (note) {
    output(`[TIP] ${note}`, "dim");
   }

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
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
   output("[WARN] Not authenticated. Run zila auth first.", "error");
   return;
  }

  try {
   output("[SEARCH] Fetching GitHub repositories...", "info");

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
    output("[ERROR] Failed to fetch repositories", "error");
    return;
   }

   const data = await response.json() as { repos: any[] };
   const { repos } = data;

   if (repos.length === 0) {
    output("\n[EMPTY] No repositories available yet.", "warning");
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

   output("\n[PKG] GitHub Repositories:\n", "success");

   Object.entries(byType).forEach(([repoType, repoList]) => {
    output(`\n[TAG] ${repoType.toUpperCase().replace("_", " ")}`, "info");

    repoList.forEach((repo: any) => {
     output(`  [LINK] ${repo.name}`, "success");

     if (repo.description) {
      output(`   ${repo.description}`, "dim");
     }

     output(`   ${repo.url}`, "dim");
     output(`   [SUPERVISOR] Added by ${repo.addedByName}`, "dim");
     output(`   [DATE] ${new Date(repo.createdAt).toLocaleDateString()}\n`, "dim");
    });
   });

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
  }
 },
};

// Helper function
function getFileIcon(fileType: string): string {
 const iconMap: Record<string, string> = {
  pdf: "[PDF]",
  docx: "[TASK]",
  md: "[LIST]",
  txt: "[TXT]",
  pptx: "[CHART]",
  xlsx: "[TREND]",
 };
 return iconMap[fileType.toLowerCase()] || "[PDF]";
}
