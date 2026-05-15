import type { ZilaCommand } from "./registry.js";
import { zilaApi, AuthRequiredError, AuthExpiredError } from "../utils/auth.js";

interface Internship {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  fit_score?: number;
  description?: string;
}

export const searchCommand: ZilaCommand = {
  name: "search",
  aliases: ["find"],
  description: "Search internships via RAG-powered semantic search",
  usage: "search <query>",
  category: "search",
  available: true,
  handler: async (args, output) => {
    const query = args.join(" ").trim();
    if (!query) {
      output("Usage:  search <query>", "warning");
      output("Example: search machine learning python remote", "dim");
      return;
    }

    output(`Searching for: ${query}`, "dim");

    try {
      const results = await zilaApi<Internship[]>(
        `/internships/search?q=${encodeURIComponent(query)}`
      );

      if (!results.length) {
        output("No internships found for that query.", "warning");
        output("Try broader terms or check back as the database grows.", "dim");
        return;
      }

      output(``, "default");
      output(`Found ${results.length} internship${results.length !== 1 ? "s" : ""}:`, "success");
      output(``, "default");

      for (const r of results.slice(0, 10)) {
        const score = r.fit_score != null ? `  fit ${Math.round(r.fit_score * 100)}%` : "";
        output(`  ${r.title ?? "Untitled"}${score}`, "default");
        if (r.company)  output(`    Company   ${r.company}`, "dim");
        if (r.location) output(`    Location  ${r.location}`, "dim");
        if (r.id)       output(`    ID        ${r.id}`, "dim");
        output(``, "default");
      }

      if (results.length > 10) {
        output(`… and ${results.length - 10} more. Refine your query to narrow results.`, "dim");
      }
    } catch (e) {
      if (e instanceof AuthRequiredError || e instanceof AuthExpiredError) {
        output(e.message, "error");
        output("Run  zila auth  to sign in.", "dim");
      } else if (e instanceof Error && e.message.includes("404")) {
        output("The search endpoint is not yet live on this server.", "warning");
        output("This feature will be available in a future release.", "dim");
      } else {
        output(`Search failed: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    }
  },
};